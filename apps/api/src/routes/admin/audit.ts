import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { requireAdmin, requirePermission } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Audit history is admin-only: the MODERATOR role intentionally lacks
// audit.view (see seedRbac), so moderators get 403 here.
router.use(requireAdmin, requirePermission('audit.view'));

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'EXPIRE', 'BULK_ACTION', 'EXPORT', 'REJECT', 'SPAM'] as const;

/**
 * GET /api/admin/audit?actorId=&action=&targetId=&page=&limit=
 * Who did what to which object, when, with what reason — newest first.
 * Actor identity is joined so the UI can show names, not just IDs.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = z
            .object({
                actorId: z.string().trim().min(1).max(128).optional(),
                action: z.enum(ACTIONS).optional(),
                targetId: z.string().trim().min(1).max(128).optional(),
                page: z.coerce.number().int().min(1).max(1000).optional().default(1),
                limit: z.coerce.number().int().min(1).max(100).optional().default(20),
            })
            .safeParse(req.query);
        if (!parsed.success) {
            const messages = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
            throw new AppError(messages.join(', '), 400);
        }
        const { actorId, action, targetId, page, limit } = parsed.data;
        const where: { userId?: string; action?: string; targetId?: string } = {};
        if (actorId) where.userId = actorId;
        if (action) where.action = action;
        if (targetId) where.targetId = targetId;

        const [entries, total] = await Promise.all([
            prisma.adminAudit.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    action: true,
                    targetId: true,
                    reason: true,
                    createdAt: true,
                    user: { select: { id: true, fullName: true, username: true, email: true } },
                },
            }),
            prisma.adminAudit.count({ where }),
        ]);

        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
            entries,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
