import { Prisma } from '@prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../../infrastructure/database/prisma';
import { ResourceItemStatus } from '@fresherflow/types';

const router = Router();

// GET /api/admin/resources - Get paginated collections
router.get('/', 
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
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
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
    createResourceValidation,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
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
    updateResourceValidation,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }

            const id = req.params.id as string;
            const { items, ...collectionData } = req.body;

            const existing = await prisma.resourceCollection.findUnique({
                where: { id }
            });

            if (!existing) {
                res.status(404).json({ error: 'Collection not found' });
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

// DELETE /api/admin/resources/:id - Delete collection
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.resourceCollection.findUnique({
            where: { id }
        });

        if (!existing) {
            res.status(404).json({ error: 'Collection not found' });
            return;
        }

        await prisma.resourceCollection.delete({
            where: { id }
        });

        // StaticFeedService.scheduleRefresh();

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/resources/:id/items - Add item to collection
router.post('/:id/items',
    [
        body('title').isString().notEmpty().trim(),
        body('type').isString().trim(),
        body('url').isURL({ require_tld: false }).trim()
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }

            const collectionId = req.params.id as string;
            const { title, type, url } = req.body;

            const existing = await prisma.resourceCollection.findUnique({
                where: { id: collectionId }
            });

            if (!existing) {
                res.status(404).json({ error: 'Collection not found' });
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
    [
        body('title').optional().isString().trim(),
        body('type').optional().isString().trim(),
        body('url').optional().isURL({ require_tld: false }).trim()
    ],
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: 'Validation failed', details: errors.array() });
                return;
            }

            const itemId = req.params.itemId as string;
            const updateData = req.body;

            const existing = await prisma.resourceItem.findUnique({
                where: { id: itemId }
            });

            if (!existing) {
                res.status(404).json({ error: 'Resource item not found' });
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
router.delete('/:collectionId/items/:itemId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const itemId = req.params.itemId as string;

        const existing = await prisma.resourceItem.findUnique({
            where: { id: itemId }
        });

        if (!existing) {
            res.status(404).json({ error: 'Resource item not found' });
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
