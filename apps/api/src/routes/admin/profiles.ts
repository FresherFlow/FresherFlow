import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../infrastructure/database/prisma';
import { requireAdmin } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { ProfileVisibility } from '@prisma/client';
import { getProfilePageState } from '@fresherflow/utils';

const router: Router = Router();

const INTRO_STATUSES = ['PENDING', 'CONTACTED', 'ARCHIVED'] as const;
type IntroStatus = (typeof INTRO_STATUSES)[number];

/**
 * GET /api/admin/profiles/intro-requests?status=PENDING&page=1
 * All intro requests — the Day-30 judge number.
 */
router.get('/intro-requests', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);
        const where: { status?: IntroStatus } = {};
        if (status && String(status) !== 'ALL') {
            const s = String(status) as IntroStatus;
            if (!INTRO_STATUSES.includes(s)) {
                return next(new AppError('Invalid status filter', 400));
            }
            where.status = s;
        }

        const [intros, total, pendingCount] = await Promise.all([
            prisma.introRequest.findMany({
                where,
                include: {
                    candidate: { select: { id: true, fullName: true, username: true, email: true } },
                    recruiter: { select: { id: true, fullName: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.introRequest.count({ where }),
            prisma.introRequest.count({ where: { status: 'PENDING' } }),
        ]);

        return res.json({
            success: true,
            data: intros,
            stats: { total, pending: pendingCount },
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        next(error);
    }
});

/** PATCH /api/admin/profiles/intro-requests/:id/status — PENDING | CONTACTED | ARCHIVED */
router.patch('/intro-requests/:id/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body as { status?: string };
        if (!status || !INTRO_STATUSES.includes(status as IntroStatus)) {
            return next(new AppError('status must be PENDING, CONTACTED, or ARCHIVED', 400));
        }
        const intro = await prisma.introRequest.update({
            where: { id: String(req.params.id) },
            data: { status: status as IntroStatus },
        });
        return res.json({ success: true, data: intro });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/profiles?page=1&visibility=PUBLIC
 * Published profile pages with owner + view counts.
 */
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '50', visibility } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);

        const where: { profilePublishedAt?: { not: null }; visibility?: ProfileVisibility } = {
            profilePublishedAt: { not: null },
        };
        if (visibility && String(visibility) !== 'ALL') {
            const v = String(visibility).toUpperCase();
            if (!['PUBLIC', 'UNLISTED', 'PRIVATE'].includes(v)) {
                return next(new AppError('Invalid visibility filter', 400));
            }
            where.visibility = v as ProfileVisibility;
        }

        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({
                where,
                select: {
                    userId: true,
                    headline: true,
                    gradCourse: true,
                    gradYear: true,
                    skills: true,
                    visibility: true,
                    openToRecruiters: true,
                    profilePublishedAt: true,
                    completionPercentage: true,
                    user: {
                        select: { id: true, fullName: true, username: true, email: true, status: true },
                    },
                },
                orderBy: { profilePublishedAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.profile.count({ where }),
        ]);

        const viewCounts = await prisma.publicProfileView.groupBy({
            by: ['profileId'],
            _count: { _all: true },
            where: { profileId: { in: profiles.map((p) => p.userId) } },
        });
        const viewsByProfile = new Map(viewCounts.map((v) => [v.profileId, v._count._all]));

        return res.json({
            success: true,
            data: profiles.map((p) => ({
                ...p,
                views: viewsByProfile.get(p.userId) ?? 0,
                // `profilePublishedAt != null` only means "activated at some point". The page
                // goes dark when that activation lapses, so the UI needs the derived state.
                pageState: getProfilePageState(p.profilePublishedAt).status,
            })),
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        next(error);
    }
});

/** PATCH /api/admin/profiles/:userId/visibility — force-hide a profile (PUBLIC | UNLISTED | PRIVATE) */
router.patch('/:userId/visibility', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { visibility } = req.body as { visibility?: string };
        if (!visibility || !['PUBLIC', 'UNLISTED', 'PRIVATE'].includes(visibility)) {
            return next(new AppError('visibility must be PUBLIC, UNLISTED, or PRIVATE', 400));
        }
        const profile = await prisma.profile.update({
            where: { userId: String(req.params.userId) },
            data: { visibility: visibility as ProfileVisibility },
        });
        return res.json({ success: true, data: { userId: profile.userId, visibility: profile.visibility } });
    } catch (error) {
        next(error);
    }
});

export default router;
