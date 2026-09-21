import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '@fresherflow/database';
import { getContributorProfile } from '../../infrastructure/services/community.service';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

/**
 * @route   GET /api/contributors/leaderboard
 * @desc    Top contributors ranked by community engagement
 */
router.get(
    '/leaderboard',
    asyncHandler(async (_req: Request, res: Response) => {
        const limit = Math.min(parseInt(_req.query.limit as string) || 20, 50);

        // Aggregate contributor stats from multiple signals
        const [topSubmitters, topCommenters, topSignalers] = await Promise.all([
            // Top job submitters
            prisma.jobSubmission.groupBy({
                by: ['submittedById'],
                _count: { _all: true },
                orderBy: { _count: { submittedById: 'desc' } },
                take: limit,
            }),
            // Top commenters
            prisma.opportunityComment.groupBy({
                by: ['userId'],
                where: { deletedAt: null },
                _count: { _all: true },
                orderBy: { _count: { userId: 'desc' } },
                take: limit,
            }),
            // Top signal providers
            prisma.jobSignal.groupBy({
                by: ['userId'],
                _count: { _all: true },
                orderBy: { _count: { userId: 'desc' } },
                take: limit,
            }),
        ]);

        // Merge all contributor IDs
        const userIds = new Set<string>([
            ...topSubmitters.map((s) => s.submittedById),
            ...topCommenters.map((c) => c.userId),
            ...topSignalers.map((s) => s.userId),
        ]);

        if (userIds.size === 0) {
            return res.json({ leaderboard: [], total: 0 });
        }

        // Fetch user profiles
        const users = await prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: {
                id: true,
                username: true,
                fullName: true,
                trustLevel: true,
                profile: { select: { avatarUrl: true } },
            },
        });

        const userMap = new Map(users.map((u) => [u.id, u] as const));
        const submitMap = new Map(topSubmitters.map((s: { submittedById: string; _count: { _all: number } }) => [s.submittedById, s._count._all] as const));
        const commentMap = new Map(topCommenters.map((c: { userId: string; _count: { _all: number } }) => [c.userId, c._count._all] as const));
        const signalMap = new Map(topSignalers.map((s: { userId: string; _count: { _all: number } }) => [s.userId, s._count._all] as const));

        // Score = submissions×3 + comments×2 + signals×1
        const leaderboard = [...userIds]
            .map((id) => {
                const user = userMap.get(id);
                if (!user) return null;
                const subs = submitMap.get(id) ?? 0;
                const comments = commentMap.get(id) ?? 0;
                const signals = signalMap.get(id) ?? 0;
                return {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    avatarUrl: user.profile?.avatarUrl ?? null,
                    trustLevel: user.trustLevel,
                    stats: {
                        submissions: subs,
                        comments,
                        signals,
                        score: subs * 3 + comments * 2 + signals,
                    },
                };
            })
            .filter(Boolean)
            .sort((a, b) => (b!.stats.score) - (a!.stats.score))
            .slice(0, limit);

        return res.json({ leaderboard, total: leaderboard.length });
    })
);

/**
 * @route   GET /api/contributors/:userId/opportunities
 * @desc    Get a contributor's public profile and published opportunities
 */
router.get(
    '/:userId/opportunities',
    asyncHandler(async (req: Request, res: Response) => {
        const userId = String(req.params.userId);
        const page = parseInt(req.query.page as string) || 1;
        const result = await getContributorProfile(userId, { page });
        return res.json(result);
    })
);

export default router;
