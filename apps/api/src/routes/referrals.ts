import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import crypto from 'crypto';

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

function hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'ff')).digest('hex').slice(0, 16);
}

async function awardBadges(userId: string, signupCount: number) {
    for (const m of BADGE_MILESTONES) {
        if (signupCount >= m.count) {
            await prisma.referralBadgeGrant.upsert({
                where: { userId_badge: { userId, badge: m.badge as any } },
                update: {},
                create: { userId, badge: m.badge as any },
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

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '';

        await prisma.referralVisit.create({
            data: {
                referralCode: code.toUpperCase(),
                referrerUserId: referrer.id,
                visitorSessionId: sessionId ?? null,
                ipHash: hashIp(ip),
                userAgent: (req.headers['user-agent'] ?? '').slice(0, 300),
            },
        });

        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── GET /api/referrals/me ───────────────────────────────────────────────────
// Authenticated: returns code, stats, referral list, earned badges

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // Ensure user has a referral code (lazy generate)
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, referralCode: true },
        });
        if (!user) return res.status(404).json({ error: 'Not found' });

        if (!user.referralCode) {
            const code = generateCode();
            user = await prisma.user.update({
                where: { id: userId },
                data: { referralCode: code },
                select: { id: true, referralCode: true },
            });
        }

        const code = user.referralCode!;
        const origin = process.env.FRONTEND_URL ?? 'https://fresherflow.in';
        const shareUrl = `${origin}/r/${code}`;

        // Stats
        const [totalClicks, referralsRaw] = await Promise.all([
            prisma.referralVisit.count({ where: { referralCode: code } }),
            prisma.user.findMany({
                where: { referredByUserId: userId },
                select: {
                    id: true, fullName: true, email: true,
                    referredAt: true, createdAt: true,
                    profile: { select: { completionPercentage: true } },
                },
                orderBy: { createdAt: 'desc' },
            })
        ]);

        const totalSignups = referralsRaw.length;
        const activated = referralsRaw.filter(r => (r.profile?.completionPercentage ?? 0) >= 40).length;

        await awardBadges(userId, totalSignups);

        const badges = await prisma.referralBadgeGrant.findMany({
            where: { userId },
            select: { badge: true, createdAt: true },
        });

        const earnedBadges = badges.map(b => ({
            badge: b.badge,
            ...BADGE_META[b.badge],
            earnedAt: b.createdAt,
        }));

        const allBadges = BADGE_MILESTONES.map(m => ({
            badge: m.badge,
            ...BADGE_META[m.badge],
            unlocked: totalSignups >= m.count,
            earnedAt: badges.find(b => b.badge === m.badge)?.createdAt ?? null,
        }));

        res.json({
            referralCode: code,
            shareUrl,
            stats: { totalClicks, totalSignups, activated },
            referrals: referralsRaw.map(r => ({
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 — easy to read

function generateCode(len = 6): string {
    let code = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
        code += CHARS[bytes[i]! % CHARS.length];
    }
    return code;
}

export default router;
export { generateCode };

