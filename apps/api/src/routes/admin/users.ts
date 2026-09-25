import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { actorId, hasPermission, requireAdmin, requirePermission, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const userStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
    reason: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/users
 * List all registered users from the database.
 */
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = Number(req.query.limit) || 1000;
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            select: {
                id: true,
                firebase_uid: true,
                username: true,
                fullName: true,
                email: true,
                role: true,
                trustLevel: true,
                status: true,
                createdAt: true,
            }
        });

        res.json({ users });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/users/handles
 * List all claimed user handles.
 */
router.get('/handles', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                username: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                trustLevel: true,
                createdAt: true,
            }
        });

        const handles = users.map(user => ({
            id: user.id,
            username: user.username!,
            fullName: user.fullName || 'Anonymous User',
            email: user.email || 'N/A',
            source: user.email ? (user.email.endsWith('@gmail.com') ? 'Google' : 'OTP Auth') : 'GitHub',
            status: user.trustLevel === 'VERIFIED' ? 'Vetted' : user.trustLevel === 'NEW' ? 'Pending' : 'Active',
            claimedAt: user.createdAt.toISOString().split('T')[0]
        }));

        res.json({ handles });
    } catch (error) {
        next(error);
    }
});


/**
 * POST /api/admin/users/:userId/vet
 * Approve/vet a user's handle.
 */
router.post('/:userId/vet', requireAdmin, requirePermission('user.manage'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId as string;
        const user = await prisma.user.update({
            where: { id: userId },
            data: { trustLevel: 'VERIFIED' }
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/users/:userId/status
 * Suspend, deactivate, or reactivate an abusive user (V1 checklist F).
 * SUSPENDED/DEACTIVATED users are blocked in requireAuth/requireStaff with
 * 403; trustLevel BANNED is also enforced. Reactivation sets ACTIVE and
 * clears a legacy BANNED trust level back to VERIFIED.
 *
 * Moderators (user session + user.manage) may suspend/reactivate plain USER
 * accounts — the explicitly-required account action for spam fighting.
 * Privileged targets (role ADMIN, or anyone holding an AccessRole grant) and
 * self-suspension are admin-only: non-admin actors get 403.
 */
router.post('/:userId/status', requireStaff, requirePermission('user.manage'), adminRateLimit, validate(userStatusSchema), withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId as string;
        const { status, reason } = req.body as { status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'; reason?: string };

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true, trustLevel: true, role: true },
        });
        if (!existing) throw new AppError('User not found', 404);

        const actor = actorId(req);
        const isAdminActor = Boolean(req.adminId);
        if (!isAdminActor) {
            if (!actor || actor === userId) {
                throw new AppError('Forbidden: Insufficient permissions', 403);
            }
            const privileged = existing.role === 'ADMIN'
                || (await hasPermission(userId, 'moderator.manage'))
                || (await hasPermission(userId, 'settings.manage'))
                || (await hasPermission(userId, 'audit.view'));
            if (privileged) {
                throw new AppError('Forbidden: Insufficient permissions', 403);
            }
        }

        const data: { status: typeof status; trustLevel?: 'BANNED' | 'VERIFIED' } = { status };
        if (status !== 'ACTIVE' && existing.trustLevel !== 'BANNED') {
            data.trustLevel = 'BANNED';
        } else if (status === 'ACTIVE' && existing.trustLevel === 'BANNED') {
            data.trustLevel = 'VERIFIED';
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, status: true, trustLevel: true },
        });

        res.json({
            success: true,
            user,
            message: reason ?? `User ${status === 'ACTIVE' ? 'reactivated' : status.toLowerCase()}`,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/users/referrers
 * List top referrers and their conversion metrics.
 */
router.get('/referrers', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const referrers = await prisma.user.findMany({
            where: {
                referralCode: { not: null }
            },
            include: {
                _count: {
                    select: { referrals: true }
                }
            }
        });

        const clicksData = await prisma.platformEvent.findMany({
            where: { type: 'REFERRAL_CLICK' },
            select: { metadata: true }
        });

        const clickCounts: Record<string, number> = {};
        for (const event of clicksData) {
            const meta = event.metadata as { referralCode?: unknown } | null;
            const code = meta?.referralCode ? String(meta.referralCode).toUpperCase() : null;
            if (code) {
                clickCounts[code] = (clickCounts[code] || 0) + 1;
            }
        }

        const referrerList = referrers.map(r => {
            const code = r.referralCode ? r.referralCode.toUpperCase() : '';
            const clickCount = clickCounts[code] || 0;
            const signupCount = r._count.referrals;
            const conversionRate = clickCount > 0 ? parseFloat(((signupCount / clickCount) * 100).toFixed(1)) : 0;
            return {
                id: r.id,
                fullName: r.fullName || 'Anonymous Referrer',
                code: r.referralCode || 'N/A',
                clicks: clickCount,
                signups: signupCount,
                conversionRate
            };
        });

        referrerList.sort((a, b) => b.signups - a.signups);

        res.json({ referrers: referrerList });
    } catch (error) {
        next(error);
    }
});

export default router;
