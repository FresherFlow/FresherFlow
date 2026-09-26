import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { normaliseRoomTags } from '../../infrastructure/services/community/community.service';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../infrastructure/database/prisma';

const router = Router();

// All admin room routes require an admin token (GET list powers the admin UI,
// POST/PATCH mutate). Mounted behind a host gate in index.ts; auth is enforced
// here. NOTE: POST /api/rooms (community router) stays as a legacy admin-only
// alias (requireAuth + requireAdmin); /api/admin/rooms is canonical for the
// admin UI. Kept, not removed, to avoid breaking existing callers.
router.use(requireAdmin);

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

const createRoomSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    icon: z.string().max(10).optional(),
    // Free-form community tags (#2026, #tcs). Tags describe the room; they
    // never execute opportunity matching.
    tags: z.array(z.string().min(1).max(50)).max(30).optional().default([]),
});

const updateRoomSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    icon: z.string().max(10).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(30).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
});

// ========================================
// List all rooms (admin — includes inactive)
// ========================================

router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
        const rooms = await prisma.room.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                createdBy: { select: { id: true, fullName: true, username: true } },
            },
        });
        return res.json({ rooms });
    })
);

// ========================================
// Create room
// ========================================

router.post(
    '/',
    adminRateLimit,
    validate(createRoomSchema),
    withAdminAudit('CREATE'),
    asyncHandler(async (req: Request, res: Response) => {
        const adminId = req.adminId;
        if (!adminId) throw new AppError('Admin authentication required', 401);

        const { slugify } = await import('@fresherflow/utils');
        const slug = slugify(String(req.body.name));
        if (!slug) throw new AppError('Invalid room name', 400);

        const existing = await prisma.room.findUnique({ where: { slug }, select: { id: true } });
        if (existing) throw new AppError('A room with this name already exists', 409);

        const room = await prisma.$transaction(async (tx) => {
            const created = await tx.room.create({
                data: {
                    slug,
                    name: String(req.body.name).trim(),
                    description: req.body.description?.trim() || null,
                    icon: req.body.icon || null,
                    // A room is a community described by free-form tags, not a typed
                    // saved search. See Room.tags in the schema.
                    tags: normaliseRoomTags(req.body.tags),
                    createdByUserId: adminId,
                    memberCount: 1,
                },
            });
            await tx.roomMember.create({
                data: { roomId: created.id, userId: adminId, role: 'ADMIN' },
            });
            return created;
        });

        return res.status(201).json({ room });
    })
);

// ========================================
// Update room (rename, edit, set status — rooms are never deleted)
// ========================================

router.patch(
    '/:id',
    adminRateLimit,
    validate(updateRoomSchema),
    withAdminAudit('UPDATE'),
    asyncHandler(async (req: Request, res: Response) => {
        const room = await prisma.room.findUnique({ where: { id: String(req.params.id) }, select: { id: true, slug: true } });
        if (!room) throw new AppError('Room not found', 404);

        const data: { name?: string; description?: string | null; icon?: string | null; tags?: string[]; status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED' } = {};
        if (req.body.name !== undefined) data.name = String(req.body.name).trim();
        if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;
        if (req.body.icon !== undefined) data.icon = req.body.icon || null;
        if (req.body.tags !== undefined) data.tags = normaliseRoomTags(req.body.tags);
        if (req.body.status !== undefined) data.status = req.body.status;

        const updated = await prisma.room.update({
            where: { id: room.id },
            data,
        });
        return res.json({ room: updated });
    })
);

export default router;
