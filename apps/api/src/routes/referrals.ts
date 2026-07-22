import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { ReferralBadge } from '@fresherflow/database';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import crypto from 'crypto';
import { getPublicSiteUrl } from '../utils/runtimeConfig';
import { eventService } from '../infrastructure/services/event.service';

const router: Router = express.Router();

const clickLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many requests',
    keyPrefix: 'rate:referral:click',
});

// ─── Badge milestones ─────────────────────────────────────────────────────────

const BADGE_MILESTONES: Array<{ count: number; badge: string }> = [
    { count: 1, badge: 'FIRST_INVITE' },
    { count: 3, badge: 'CONNECTOR' },
    { count: 5, badge: 'CAMPUS_SCOUT' },
    { count: 10, badge: 'GROWTH_NODE' },
    { count: 25, badge: 'NETWORK_BUILDER' },
];

const BADGE_META: Record<string, { label: string; description: string; emoji: string }> = {
    FIRST_INVITE: { label: 'First Invite', description: '1 friend signed up via your link', emoji: '🌱' },
    CONNECTOR: { label: 'Connector', description: '3 friends signed up via your link', emoji: '🔗' },
    CAMPUS_SCOUT: { label: 'Campus Scout', description: '5 friends joined FresherFlow', emoji: '🎓' },
    GROWTH_NODE: { label: 'Growth Node', description: '10 friends joined FresherFlow', emoji: '🚀' },
    NETWORK_BUILDER: { label: 'Network Builder', description: '25 friends joined FresherFlow', emoji: '🌐' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function awardBadges(userId: string, signupCount: number) {
    const existingBadges = await prisma.referralBadgeGrant.findMany({ where: { userId } });
    const earnedSet = new Set(existingBadges.map((b) => b.badge));

    for (const m of BADGE_MILESTONES) {
        if (signupCount >= m.count && !earnedSet.has(m.badge as ReferralBadge)) {
            await prisma.referralBadgeGrant.create({
                data: { userId, badge: m.badge as ReferralBadge }
            }).catch(() => { /* ignore dup */ });
        }
    }
}

// GET /api/public/referrals/:code — validate code
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params as { code: string };
        if (code === 'me') return next(); // let /me fall through to auth handler
        const user = await prisma.user.findFirst({
            where: { referralCode: code.toUpperCase() },
            select: { id: true, fullName: true },
        });
        if (!user) return res.status(404).json({ error: 'Invalid referral code' });
        res.json({ valid: true, referrerId: user.id });
    } catch (e) { next(e); }
});

// POST /api/public/referrals/:code/click — record a click
router.post('/:code/click', clickLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params as { code: string };
        const { sessionId } = req.body as { sessionId?: string };

        const referrer = await prisma.user.findFirst({
            where: { referralCode: code.toUpperCase() },
            select: { id: true },
        });
        if (!referrer) return res.status(404).json({ error: 'Invalid code' });

        // Use Unified Event System
        await eventService.track({
            type: 'REFERRAL_CLICK',
            source: 'referral_link',
            sessionId: sessionId || undefined,
            metadata: {
                referralCode: code.toUpperCase(),
                referrerUserId: referrer.id
            }
        });

        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── GET /api/referrals/me ───────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, referralCode: true },
        });
        if (!user) return res.status(404).json({ error: 'Not found' });

        if (!user.referralCode) {
            let codeGenerated = false;
            let maxRetries = 3;
            let newCode = '';
            while (!codeGenerated && maxRetries > 0) {
                try {
                    newCode = generateCode();
                    user = await prisma.user.update({
                        where: { id: userId },
                        data: { referralCode: newCode },
                        select: { id: true, referralCode: true },
                    });
                    codeGenerated = true;
                } catch (e) {
                    if ((e as { code?: string }).code !== 'P2002') throw e;
                    maxRetries--;
                }
            }
            if (!codeGenerated) return res.status(500).json({ error: 'Failed to generate code' });
        }

        const code = user.referralCode!;
        const origin = process.env.FRONTEND_URL ?? getPublicSiteUrl();
        const shareUrl = `${origin}/r/${code}`;

        // Stats from PlatformEvent
        const [totalClicks, totalSignups, activated, referralsRaw] = await Promise.all([
            prisma.platformEvent.count({
                where: {
                    type: 'REFERRAL_CLICK',
                    metadata: { path: ['referralCode'], equals: code.toUpperCase() }
                }
            }),
            prisma.user.count({ where: { referredByUserId: userId } }),
            prisma.user.count({
                where: {
                    referredByUserId: userId,
                    profile: { completionPercentage: { gte: 40 } }
                }
            }),
            prisma.user.findMany({
                where: { referredByUserId: userId },
                select: {
                    id: true, fullName: true, email: true,
                    referredAt: true, createdAt: true,
                    profile: { select: { completionPercentage: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);

        await awardBadges(userId, totalSignups);

        const badges = await prisma.referralBadgeGrant.findMany({
            where: { userId },
            select: { badge: true, createdAt: true },
        });

        const allBadges = BADGE_MILESTONES.map((m) => ({
            badge: m.badge,
            ...BADGE_META[m.badge],
            unlocked: totalSignups >= m.count,
            earnedAt: badges.find((b) => b.badge === m.badge)?.createdAt ?? null,
        }));

        res.json({
            referralCode: code,
            shareUrl,
            stats: { totalClicks, totalSignups, activated },
            referrals: referralsRaw.map((r) => ({
                id: r.id,
                fullName: r.fullName,
                joinedAt: r.referredAt ?? r.createdAt,
                completionPct: r.profile?.completionPercentage ?? 0,
                activated: (r.profile?.completionPercentage ?? 0) >= 40,
            })),
            badges: allBadges,
        });
    } catch (e) { next(e); }
});

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(len = 6): string {
    let code = '';
    for (let i = 0; i < len; i++) {
        code += CHARS[crypto.randomInt(0, CHARS.length)];
    }
    return code;
}

export default router;
export { generateCode };
