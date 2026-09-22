import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createRateLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/auth';
import { ProfileVisibility } from '@prisma/client';
import crypto from 'crypto';
import { logger, profilePageActiveSince } from '@fresherflow/utils';

const router = Router();

// Public profile reads are cheap and frequent; a light IP limiter keeps scrapers honest.
const publicReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests. Please slow down.',
    keyPrefix: 'public-profile-read',
});

// Intro requests are the most abusable surface of the growth loop: cap per IP.
const introRequestLimiter = createRateLimiter(
    process.env.INTRO_REQUEST_RATE_LIMIT_MAX
        ? {
            windowMs: 24 * 60 * 60 * 1000,
            max: Number(process.env.INTRO_REQUEST_RATE_LIMIT_MAX),
            message: 'Daily intro request limit reached. Try again tomorrow.',
            keyPrefix: 'intro-request',
        }
        : {
            windowMs: 60 * 60 * 1000,
            max: 5,
            message: 'Too many intro requests. Please try again later.',
            keyPrefix: 'intro-request',
        },
);

const introRequestSchema = z.object({
    candidateId: z.string().min(1).max(64),
    message: z.string().max(1000).optional(),
    recruiterName: z.string().min(1).max(120).optional(),
    recruiterCompany: z.string().max(120).optional(),
    recruiterEmail: z.string().email().max(200).optional(),
    recruiterPhone: z.string().max(20).optional(),
});

const publicProfileSelect = {
    userId: true,
    headline: true,
    about: true,
    gradCourse: true,
    gradSpecialization: true,
    gradYear: true,
    collegeName: true,
    educationLevel: true,
    skills: true,
    availability: true,
    preferredCities: true,
    workModes: true,
    expectedCtc: true,
    resumeUrl: true,
    willingToRelocate: true,
    openToRecruiters: true,
    visibility: true,
    profilePublishedAt: true,
    completionPercentage: true,
    user: {
        select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            createdAt: true,
            projects: {
                orderBy: { order: 'asc' as const },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    githubUrl: true,
                    liveUrl: true,
                    skills: true,
                },
            },
        },
    },
} as const;

type PublicProfileRow = {
    userId: string;
    headline: string | null;
    about: string | null;
    gradCourse: string | null;
    gradSpecialization: string | null;
    gradYear: number | null;
    collegeName: string | null;
    educationLevel: string | null;
    skills: string[];
    availability: string | null;
    preferredCities: string[];
    workModes: string[];
    expectedCtc: number | null;
    resumeUrl: string | null;
    willingToRelocate: boolean | null;
    openToRecruiters: boolean;
    visibility: ProfileVisibility;
    profilePublishedAt: Date | null;
    completionPercentage: number;
    user: {
        id: string;
        fullName: string | null;
        username: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        projects: Array<{
            id: string;
            title: string;
            description: string | null;
            githubUrl: string | null;
            liveUrl: string | null;
            skills: string[];
        }>;
    };
};

/** Public payload — never leaks email, DOB, reservation data, or admin fields. */
function toPublicProfile(row: PublicProfileRow) {
    return {
        userId: row.userId,
        fullName: row.user.fullName,
        username: row.user.username,
        avatarUrl: row.user.avatarUrl,
        memberSince: row.user.createdAt,
        headline: row.headline,
        about: row.about,
        degree: row.gradCourse,
        specialization: row.gradSpecialization,
        gradYear: row.gradYear,
        collegeName: row.collegeName,
        educationLevel: row.educationLevel,
        skills: row.skills,
        availability: row.availability,
        preferredCities: row.preferredCities,
        workModes: row.workModes,
        expectedCtc: row.expectedCtc,
        resumeUrl: row.resumeUrl,
        willingToRelocate: row.willingToRelocate,
        openToRecruiters: row.openToRecruiters,
        completionPercentage: row.completionPercentage,
        // Only ever exposed for live pages (the query filters expired activations out),
        // so it is safe to surface as a freshness signal.
        lastActivatedAt: row.profilePublishedAt,
        projects: row.user.projects,
    };
}

/**
 * PUBLIC /api/public/profiles/browse?skill=&batch=&degree=&search=&page=
 * Week-1 demand test: recruiters browse the public directory WITHOUT an account.
 * Rate-limited; never returns contact info — intros go through the capture form.
 */
router.get('/browse', publicReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { skill, batch, degree, search, page = '1', limit = '24' } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 24, 1), 48);

        const whereClause: Record<string, unknown> = {
            openToRecruiters: true,
            visibility: { in: [ProfileVisibility.PUBLIC, ProfileVisibility.UNLISTED] },
            // Stale activations drop out of the directory too.
            profilePublishedAt: { gt: profilePageActiveSince() },
            user: { status: 'ACTIVE', deletedAt: null },
        };
        if (batch) whereClause.gradYear = parseInt(String(batch), 10) || undefined;
        if (degree) whereClause.gradCourse = String(degree);
        if (skill) whereClause.skills = { has: String(skill).trim() };
        if (search) {
            const q = String(search).trim();
            whereClause.OR = [
                { headline: { contains: q, mode: 'insensitive' } },
                { about: { contains: q, mode: 'insensitive' } },
                { skills: { has: q } },
            ];
        }

        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({
                where: whereClause,
                select: {
                    userId: true,
                    headline: true,
                    skills: true,
                    gradCourse: true,
                    gradSpecialization: true,
                    gradYear: true,
                    availability: true,
                    preferredCities: true,
                    expectedCtc: true,
                    willingToRelocate: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            projects: { select: { id: true, title: true, skills: true }, take: 2 },
                        },
                    },
                },
                orderBy: { profilePublishedAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.profile.count({ where: whereClause }),
        ]);

        return res.json({
            success: true,
            data: profiles,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        next(error);
    }
});

/** PUBLIC /api/public/profiles/:username — fetch a shareable profile page payload. */
router.get('/:username', publicReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = String(req.params.username || '').toLowerCase();

        if (!/^[a-z0-9_]{3,30}$/.test(username)) {
            return next(new AppError('Profile not found', 404));
        }

        // A published page must be reachable by its own link even when the owner has not
        // opted into recruiter intro requests — the CTA is hidden client-side instead.
        // (The /browse directory below still requires openToRecruiters: true.)
        //
        // Activation only lasts PROFILE_PAGE_ACTIVE_DAYS: past that the link is dark until
        // the owner reactivates, so the same cutoff is applied to every public read.
        const row = (await prisma.profile.findFirst({
            where: {
                user: { username, status: 'ACTIVE' },
                visibility: { in: [ProfileVisibility.PUBLIC, ProfileVisibility.UNLISTED] },
                profilePublishedAt: { gt: profilePageActiveSince() },
            },
            select: publicProfileSelect,
        })) as unknown as PublicProfileRow | null;

        if (!row) {
            return next(new AppError('Profile not found', 404));
        }

        return res.json({ success: true, data: toPublicProfile(row) });
    } catch (error) {
        next(error);
    }
});

/** PUBLIC /api/public/profiles/:username/view — owner-visible view counter. */
router.post('/:username/view', publicReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = String(req.params.username || '').toLowerCase();
        if (!/^[a-z0-9_]{3,30}$/.test(username)) {
            return next(new AppError('Profile not found', 404));
        }

        const target = await prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        if (!target) {
            return next(new AppError('Profile not found', 404));
        }

        // viewerKey: the owner never inflates their own counter; anonymous visitors get a stable session key.
        const rawSession = typeof req.body?.viewerSession === 'string' ? req.body.viewerSession.slice(0, 64) : '';
        const viewerKey = req.userId && req.userId !== target.id
            ? `u:${req.userId}`
            : rawSession
                ? `s:${rawSession}`
                : `ip:${crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.ip || '')).digest('hex')}`;

        // Unique-view upsert; counted only when this viewer has never seen the profile.
        const result = await prisma.publicProfileView.upsert({
            where: { profileId_viewerKey: { profileId: target.id, viewerKey } },
            create: { profileId: target.id, viewerKey },
            update: {},
        });

        const views = await prisma.publicProfileView.count({ where: { profileId: target.id } });
        const createdAt = result.viewedAt;
        return res.json({ success: true, views, countedNow: createdAt.getTime() > Date.now() - 5000 });
    } catch (error) {
        next(error);
    }
});

/**
 * PUBLIC /api/public/profiles/:username/intro-request
 * The demand test: anyone can request an intro; we capture it and email the owner.
 * Authenticated recruiters are recorded with their real user id; anonymous ones
 * must provide name + a contact channel (email or phone).
 */
router.post(
    '/:username/intro-request',
    introRequestLimiter,
    optionalAuth,
    validate(introRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const username = String(req.params.username || '').toLowerCase();
            const { candidateId, message, recruiterName, recruiterCompany, recruiterEmail, recruiterPhone } = req.body as {
                candidateId?: string;
                message?: string;
                recruiterName?: string;
                recruiterCompany?: string;
                recruiterEmail?: string;
                recruiterPhone?: string;
            };

            if (!candidateId) {
                return next(new AppError('candidateId is required', 400));
            }

            const target = await prisma.user.findUnique({
                where: { username },
                select: { id: true, fullName: true, username: true, email: true },
            });

            if (!target || target.id !== candidateId) {
                return next(new AppError('Profile not found', 404));
            }

            const profile = await prisma.profile.findFirst({
                where: {
                    userId: target.id,
                    openToRecruiters: true,
                    visibility: { in: [ProfileVisibility.PUBLIC, ProfileVisibility.UNLISTED] },
                },
                select: { userId: true },
            });
            if (!profile) {
                return next(new AppError('This profile is not accepting intro requests', 403));
            }

            const recruiterUser = req.userId
                ? await prisma.user.findUnique({
                    where: { id: req.userId },
                    select: { id: true, fullName: true, email: true },
                })
                : null;

            if (recruiterUser && recruiterUser.id === target.id) {
                return next(new AppError('You cannot request an intro on your own profile', 400));
            }

            const resolvedName = recruiterUser?.fullName || recruiterName;
            const resolvedEmail = recruiterUser?.email || recruiterEmail;

            if (!resolvedName || (!resolvedEmail && !recruiterPhone)) {
                return next(new AppError('Your name and an email or phone number are required', 400));
            }

            const contactBlock = [
                `Recruiter: ${resolvedName}${recruiterCompany ? ` (${recruiterCompany})` : ''}`,
                resolvedEmail ? `Email: ${resolvedEmail}` : null,
                recruiterPhone ? `Phone: ${recruiterPhone}` : null,
                message ? `Message: ${message}` : null,
            ]
                .filter(Boolean)
                .join('\n');

            // One request per recruiter per candidate (unique on recruiterId+candidateId,
            // anonymous recruiters stored with null recruiterId bypass the unique — acceptable
            // for the 30-day test; the IP rate limiter is the real flood guard).
            const intro = await prisma.introRequest.create({
                data: {
                    recruiterId: recruiterUser?.id ?? null,
                    candidateId: target.id,
                    message: contactBlock,
                },
            });

            // The fresher must KNOW demand arrived — deliver on both surfaces they already check:
            // the alerts bell (AlertDelivery drives the unread badge) and community notifications.
            await prisma.alertDelivery
                .create({
                    data: {
                        userId: target.id,
                        kind: 'HIGHLIGHT',
                        channel: 'APP',
                        dedupeKey: `intro:${intro.id}`,
                        metadata: JSON.stringify({
                            introId: intro.id,
                            recruiterName: resolvedName,
                            recruiterCompany: recruiterCompany ?? null,
                            contactBlock,
                        }),
                    },
                })
                .catch((err) => logger.warn('[intro-request] alert delivery write failed', { err }));

            await prisma.notification
                .create({
                    data: {
                        userId: target.id,
                        type: 'INTRO_REQUEST',
                        actorId: recruiterUser?.id ?? null,
                        payload: {
                            introId: intro.id,
                            recruiterName: resolvedName,
                            recruiterCompany: recruiterCompany ?? null,
                            profileUsername: target.username,
                        },
                    },
                })
                .catch((err) => logger.warn('[intro-request] notification write failed', { err }));

            // Week-1 demand test: an email is the whole notification system.
            logger.info('[intro-request] captured', {
                candidateId: target.id,
                candidateEmail: target.email,
                introId: intro.id,
                contactBlock,
            });
            if (process.env.INTRO_REQUEST_WEBHOOK_URL) {
                void fetch(process.env.INTRO_REQUEST_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ candidate: target, contactBlock }),
                }).catch((err) => logger.warn('[intro-request] webhook failed', { err }));
            }

            return res.status(201).json({ success: true, message: 'Intro request sent. The candidate will get back to you.' });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
