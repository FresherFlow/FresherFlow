import { Prisma } from '@prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../../infrastructure/database/prisma';
import { hasPermission, requirePermission, requireStaff } from '../../middleware/auth';
import { withAdminAudit } from '../../middleware/adminAudit';
import { sendError, ErrorCode } from '../../middleware/errorHandler';
import { ResourceItemStatus } from '@fresherflow/types';

const router = Router();

// Staff auth on the router; each route adds its own least-privilege gate.
// Review flow (list + approve/reject via PATCH :id) needs resource.moderate;
// collection authoring (create, item edits, deleting live collections) needs
// resource.manage, which stays SUPER_ADMIN-only via the seed.
// NOTE: this router previously relied only on the mount-level domain gate in
// index.ts; staff auth is added here so the permission check has an
// authenticated identity and unauthenticated callers get 401, not 403.
router.use(requireStaff);

/**
 * Approving/rejecting a collection (status-only change) is moderation work
 * (resource.moderate); editing metadata or items is collection authoring
 * (resource.manage, SUPER_ADMIN-only).
 */
function requireResourcePatchPermission(req: Request, res: Response, next: NextFunction) {
    const keys = Object.keys((req.body as Record<string, unknown>) || {});
    const statusOnly = keys.length > 0 && keys.every((k) => k === 'status');
    return requirePermission(statusOnly ? 'resource.moderate' : 'resource.manage')(req, res, next);
}

// GET /api/admin/resources - Get paginated collections
router.get('/',
    requirePermission('resource.moderate'), 
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('status').optional().isIn(['PENDING_REVIEW', 'APPROVED']),
        query('search').optional().isString().trim(),
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Validation failed', req.requestId, errors.array());
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            
            const status = req.query.status as ResourceItemStatus | undefined;
            const search = req.query.search as string | undefined;

            const where: Prisma.ResourceCollectionWhereInput = {};
            if (status) {
                where.status = status;
            }
            if (search) {
                where.title = { contains: search, mode: 'insensitive' };
            }

            const [collections, total] = await Promise.all([
                prisma.resourceCollection.findMany({
                    where,
                    include: {
                        items: true
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.resourceCollection.count({ where })
            ]);

            res.json({
                resources: collections,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/admin/resources - Create a new collection
const createResourceValidation = [
    body('title').isString().notEmpty().trim(),
    body('description').optional({ nullable: true }).isString().trim(),
    body('company').optional({ nullable: true }).isString().trim(),
    body('skills').optional().isArray(),
    body('skills.*').isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').isString().trim(),
    body('status').optional().isIn(['PENDING_REVIEW', 'APPROVED']),
    body('sector').optional().isIn(['PRIVATE', 'GOVERNMENT']),
    body('items').isArray().withMessage('Items array is required'),
    body('items.*.title').isString().notEmpty().trim(),
    body('items.*.type').isString().trim(),
    body('items.*.url').isURL({ require_tld: false }).trim(),
];

router.post('/',
    requirePermission('resource.manage'),
    createResourceValidation,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Validation failed', req.requestId, errors.array());
                return;
            }

            const { title, description, company, skills, tags, status, items, sector } = req.body;

            const collection = await prisma.resourceCollection.create({
                data: {
                    title,
                    description: description || null,
                    company: company || null,
                    skills: skills || [],
                    tags: tags || [],
                    status: status || 'APPROVED', // Default to APPROVED for admin creations
                    sector: sector || 'PRIVATE',
                    addedByUserId: (req as unknown as { user?: { id: string } }).user?.id || 'admin',
                    addedByUsername: (req as unknown as { user?: { username: string } }).user?.username || 'admin',
                    items: {
                        create: items.map((item: { title: string; type: string; url: string }) => ({
                            title: item.title.trim(),
                            type: item.type,
                            url: item.url.trim()
                        }))
                    }
                },
                include: {
                    items: true
                }
            });

            // StaticFeedService.scheduleRefresh();

            res.status(201).json({ resource: collection });
        } catch (error) {
            next(error);
        }
    }
);

// PATCH /api/admin/resources/:id - Update collection metadata
const updateResourceValidation = [
    body('title').optional().isString().trim(),
    body('description').optional({ nullable: true }).isString().trim(),
    body('company').optional({ nullable: true }).isString().trim(),
    body('skills').optional().isArray(),
    body('skills.*').isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').isString().trim(),
    body('status').optional().isIn(['PENDING_REVIEW', 'APPROVED']),
    body('sector').optional().isIn(['PRIVATE', 'GOVERNMENT']),
    body('items').optional().isArray(),
    body('items.*.id').optional().isString(),
    body('items.*.title').optional().isString().notEmpty().trim(),
    body('items.*.type').optional().isString().trim(),
    body('items.*.url').optional().isURL({ require_tld: false }).trim(),
];

router.patch('/:id',
    requireResourcePatchPermission,
    withAdminAudit('UPDATE'),
    updateResourceValidation,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Validation failed', req.requestId, errors.array());
                return;
            }

            const id = req.params.id as string;
            const { items, ...collectionData } = req.body;

            const existing = await prisma.resourceCollection.findUnique({
                where: { id }
            });

            if (!existing) {
                sendError(res, 404, ErrorCode.NOT_FOUND, 'Collection not found', req.requestId);
                return;
            }

            const collection = await prisma.$transaction(async (tx) => {
                await tx.resourceCollection.update({
                    where: { id },
                    data: collectionData,
                });

                if (items) {
                    const existingItems = await tx.resourceItem.findMany({
                        where: { collectionId: id }
                    });
                    
                    const existingItemIds = existingItems.map(item => item.id);
                    const incomingItemIds = items.filter((item: { id?: string }) => item.id).map((item: { id?: string }) => item.id as string);
                    
                    // Delete items not in incoming request
                    const itemsToDelete = existingItemIds.filter(itemId => !incomingItemIds.includes(itemId));
                    if (itemsToDelete.length > 0) {
                        await tx.resourceItem.deleteMany({
                            where: {
                                id: { in: itemsToDelete }
                            }
                        });
                    }
                    
                    // Update existing items or create new ones
                    for (const item of items) {
                        if (item.id && existingItemIds.includes(item.id)) {
                            await tx.resourceItem.update({
                                where: { id: item.id },
                                data: {
                                    title: item.title.trim(),
                                    type: item.type,
                                    url: item.url.trim()
                                }
                            });
                        } else {
                            await tx.resourceItem.create({
                                data: {
                                    collectionId: id,
                                    title: item.title.trim(),
                                    type: item.type,
                                    url: item.url.trim()
                                }
                            });
                        }
                    }
                }

                return await tx.resourceCollection.findUnique({
                    where: { id },
                    include: { items: true }
                });
            });

            // StaticFeedService.scheduleRefresh();

            res.json({ resource: collection });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/admin/resources/:id - Delete collection.
// Rejecting a pending submission (PENDING_REVIEW) is moderation work;
// deleting a live (APPROVED) collection is collection authoring.
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.resourceCollection.findUnique({
            where: { id },
            select: { id: true, status: true },
        });

        if (!existing) {
            sendError(res, 404, ErrorCode.NOT_FOUND, 'Collection not found', req.requestId);
            return;
        }

        const actor = req.adminId ?? req.userId;
        if (!actor) {
            sendError(res, 401, ErrorCode.UNAUTHENTICATED, 'Authentication required', req.requestId);
            return;
        }
        const needed = existing.status === 'PENDING_REVIEW' ? 'resource.moderate' : 'resource.manage';
        if (!(await hasPermission(actor, needed))) {
            sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden: Insufficient permissions', req.requestId);
            return;
        }

        await prisma.resourceCollection.delete({
            where: { id }
        });

        // 204 responses bypass withAdminAudit (it hooks res.json), so record
        // the rejection/removal explicitly. Best-effort: never fail the delete.
        try {
            await prisma.adminAudit.create({
                data: { userId: actor, action: 'DELETE', targetId: id },
            });
        } catch {
            // Audit write failures must not undo the moderation decision.
        }

        // StaticFeedService.scheduleRefresh();

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/resources/:id/items - Add item to collection
router.post('/:id/items',
    requirePermission('resource.manage'),
    [
        body('title').isString().notEmpty().trim(),
        body('type').isString().trim(),
        body('url').isURL({ require_tld: false }).trim()
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Validation failed', req.requestId, errors.array());
                return;
            }

            const collectionId = req.params.id as string;
            const { title, type, url } = req.body;

            const existing = await prisma.resourceCollection.findUnique({
                where: { id: collectionId }
            });

            if (!existing) {
                sendError(res, 404, ErrorCode.NOT_FOUND, 'Collection not found', req.requestId);
                return;
            }

            const item = await prisma.resourceItem.create({
                data: {
                    collectionId,
                    title,
                    type,
                    url
                }
            });

            // StaticFeedService.scheduleRefresh();

            res.status(201).json({ item });
        } catch (error) {
            next(error);
        }
    }
);

// PATCH /api/admin/resources/:collectionId/items/:itemId - Update item
router.patch('/:collectionId/items/:itemId',
    requirePermission('resource.manage'),
    [
        body('title').optional().isString().trim(),
        body('type').optional().isString().trim(),
        body('url').optional().isURL({ require_tld: false }).trim()
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Validation failed', req.requestId, errors.array());
                return;
            }

            const itemId = req.params.itemId as string;
            const updateData = req.body;

            const existing = await prisma.resourceItem.findUnique({
                where: { id: itemId }
            });

            if (!existing) {
                sendError(res, 404, ErrorCode.NOT_FOUND, 'Resource item not found', req.requestId);
                return;
            }

            const item = await prisma.resourceItem.update({
                where: { id: itemId },
                data: updateData
            });

            // StaticFeedService.scheduleRefresh();

            res.json({ item });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/admin/resources/:collectionId/items/:itemId - Delete item
router.delete('/:collectionId/items/:itemId', requirePermission('resource.manage'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const itemId = req.params.itemId as string;

        const existing = await prisma.resourceItem.findUnique({
            where: { id: itemId }
        });

        if (!existing) {
            sendError(res, 404, ErrorCode.NOT_FOUND, 'Resource item not found', req.requestId);
            return;
        }

        await prisma.resourceItem.delete({
            where: { id: itemId }
        });

        // StaticFeedService.scheduleRefresh();

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
