import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../infrastructure/database/prisma';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

const createRoomSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    icon: z.string().max(10).optional(),
    type: z.enum(['BATCH', 'SKILL', 'LOCATION', 'COMPANY', 'TOPIC', 'CUSTOM']).optional(),
});

const updateRoomSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    icon: z.string().max(10).nullable().optional(),
    type: z.enum(['BATCH', 'SKILL', 'LOCATION', 'COMPANY', 'TOPIC', 'CUSTOM']).optional(),
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
    validate(createRoomSchema),
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
                    type: req.body.type ?? 'CUSTOM',
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
    validate(updateRoomSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const room = await prisma.room.findUnique({ where: { id: String(req.params.id) }, select: { id: true, slug: true } });
        if (!room) throw new AppError('Room not found', 404);

        const data: Record<string, unknown> = {};
        if (req.body.name !== undefined) data.name = String(req.body.name).trim();
        if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;
        if (req.body.icon !== undefined) data.icon = req.body.icon || null;
        if (req.body.type !== undefined) data.type = req.body.type;
        if (req.body.status !== undefined) data.status = req.body.status;

        const updated = await prisma.room.update({
            where: { id: room.id },
            data,
        });
        return res.json({ room: updated });
    })
);

export default router;
