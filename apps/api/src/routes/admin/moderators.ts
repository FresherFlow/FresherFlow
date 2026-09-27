import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { requireAdmin, requirePermission, requireStaff, getUserPermissions } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

/**
 * GET /api/admin/moderators/me
 * Who is calling: works for admin sessions and moderator user sessions
 * (requireStaff, not requireAdmin). Returns the effective permission keys
 * plus an explicit moderator flag so clients can tell a bare-grant
 * moderator (grant row, zero permission rows yet) apart from a plain user —
 * the keys-only endpoint cannot make that distinction, and clients would
 * show a false 401. Every queue route re-checks server-side; this payload
 * is advisory for nav gating.
 */
router.get('/me', requireStaff, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId ?? req.adminId ?? null;
        if (!userId) {
            return next(new AppError('Authentication required', 401));
        }
        const [grant, permissions] = await Promise.all([
            req.adminId
                ? null
                : prisma.userAccessRole.findFirst({ where: { userId }, select: { userId: true } }),
            getUserPermissions(userId),
        ]);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
            userId,
            isModerator: req.adminId != null || grant != null,
            permissions,
        });
    } catch (error) {
        next(error);
    }
});

// Granting/revoking the Moderator role is admin-only: moderators hold no
// moderator.manage permission (see seedRbac), so they get 403 here while
// still moderating through the staff-gated queues.
router.use(requireAdmin, requirePermission('moderator.manage'));

const grantSchema = z.object({
    reason: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/moderators
 * List every holder of the MODERATOR AccessRole: who, account status,
 * when the role was assigned and by whom. No-store: account status is live.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await prisma.accessRole.findUnique({
            where: { name: 'MODERATOR' },
            select: { id: true },
        });
        if (!role) {
            return res.json({ moderators: [] });
        }
        const rows = await prisma.userAccessRole.findMany({
            where: { roleId: role.id },
            orderBy: { assignedAt: 'desc' },
            select: {
                assignedAt: true,
                assignedBy: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        role: true,
                        status: true,
                        trustLevel: true,
                        createdAt: true,
                    },
                },
            },
        });
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
            moderators: rows.map((row) => ({
                ...row.user,
                assignedAt: row.assignedAt,
                assignedBy: row.assignedBy,
            })),
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/moderators/:userId
 * Grant the Moderator role to an existing user. Idempotent guard: an
 * existing grant is a 409, never a duplicate row.
 */
router.post(
    '/:userId',
    adminRateLimit,
    validate(grantSchema),
    withAdminAudit('CREATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = String(req.params.userId);
            const actor = req.adminId ?? 'system';

            const granted = await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { id: true, status: true },
                });
                if (!user) throw new AppError('User not found', 404);

                const role = await tx.accessRole.findUnique({
                    where: { name: 'MODERATOR' },
                    select: { id: true },
                });
                if (!role) throw new AppError('Moderator role is not configured', 500);

                const existing = await tx.userAccessRole.findUnique({
                    where: { userId_roleId: { userId, roleId: role.id } },
                });
                if (existing) throw new AppError('User is already a moderator', 409);

                return tx.userAccessRole.create({
                    data: { userId, roleId: role.id, assignedBy: actor },
                    select: { userId: true, assignedAt: true, assignedBy: true },
                });
            });

            return res.status(201).json({ success: true, grant: granted });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * DELETE /api/admin/moderators/:userId
 * Remove the Moderator role. Underlying account status is untouched —
 * suspend/reactivate stays on POST /api/admin/users/:userId/status.
 */
router.delete(
    '/:userId',
    adminRateLimit,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = String(req.params.userId);

            const removed = await prisma.$transaction(async (tx) => {
                const role = await tx.accessRole.findUnique({
                    where: { name: 'MODERATOR' },
                    select: { id: true },
                });
                if (!role) throw new AppError('Moderator role is not configured', 500);

                const existing = await tx.userAccessRole.findUnique({
                    where: { userId_roleId: { userId, roleId: role.id } },
                });
                if (!existing) throw new AppError('User is not a moderator', 404);

                await tx.userAccessRole.delete({
                    where: { userId_roleId: { userId, roleId: role.id } },
                });
                return { userId };
            });

            return res.json({ success: true, ...removed });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
