import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

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
router.post('/:userId/vet', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
