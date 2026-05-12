import prisma from '../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';
import express, { Router, Request, Response, NextFunction } from 'express';

import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { educationSchema, preferencesSchema, readinessSchema, contributionSchema } from '../utils/validation';
import TelegramService from '../infrastructure/services/telegram.service';
import { AppError } from '../middleware/errorHandler';
import { Profile } from '@fresherflow/types';
import { calculateCompletion, normalizeProfileEducation, normalizeSkills } from '@fresherflow/domain';
import { normalizeOpportunityUrl } from '@fresherflow/utils';

const router: Router = express.Router();

async function hydrateProfileCompletion(userId: string, profile: Profile | null) {
    if (!profile) return null;

    const calculatedCompletion = calculateCompletion(profile);
    if (profile.completionPercentage === calculatedCompletion) {
        return profile;
    }

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { completionPercentage: calculatedCompletion }
    });

    return updatedProfile as unknown as Profile;
}


// GET /api/profile
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const storedProfile = await prisma.profile.findUnique({
            where: { userId: req.userId }
        });

        if (!storedProfile) {
            return next(new AppError('Profile not found', 404));
        }

        const profile = await hydrateProfileCompletion(req.userId as string, storedProfile as unknown as Profile);

        res.json({ profile });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile - Comprehensive update
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fullName, ...data } = req.body;
        const normalizedGrad = normalizeProfileEducation(data.gradCourse, data.gradSpecialization);
        const normalizedPg = normalizeProfileEducation(data.pgCourse, data.pgSpecialization);
        const normalizedSkills = normalizeSkills(data.skills);

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: req.userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                educationLevel: data.educationLevel,
                tenthYear: data.tenthYear,
                twelfthYear: data.twelfthYear,
                gradCourse: normalizedGrad.course,
                gradSpecialization: normalizedGrad.specialization,
                gradYear: data.gradYear,
                pgCourse: normalizedPg.course || null,
                pgSpecialization: normalizedPg.specialization || null,
                pgYear: data.pgYear,
                interestedIn: data.interestedIn,
                preferredCities: data.preferredCities,
                workModes: data.workModes,
                availability: data.availability,
                skills: normalizedSkills
            }
        });

        // Recalculate completion percentage
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile synchronized. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/education (40% weight)
router.put('/education', requireAuth, validate(educationSchema.extend({ fullName: z.string().min(1, 'Full name is required').optional() })), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            fullName,
            educationLevel,
            tenthYear,
            twelfthYear,
            gradCourse, gradSpecialization, gradYear,
            pgCourse, pgSpecialization, pgYear
        } = req.body;
        const normalizedGrad = normalizeProfileEducation(gradCourse, gradSpecialization);
        const normalizedPg = normalizeProfileEducation(pgCourse, pgSpecialization);

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: req.userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                educationLevel,
                tenthYear,
                twelfthYear,
                gradCourse: normalizedGrad.course,
                gradSpecialization: normalizedGrad.specialization,
                gradYear,
                pgCourse: normalizedPg.course || null,
                pgSpecialization: normalizedPg.specialization || null,
                pgYear
            }
        });

        // Recalculate completion percentage (DERIVED FIELD)
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/preferences (40% weight)
router.put('/preferences', requireAuth, validate(preferencesSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interestedIn, preferredCities, workModes } = req.body;

        // Validate max 5 cities
        if (preferredCities.length > 5) {
            return next(new AppError('Maximum 5 cities allowed', 400));
        }

        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                interestedIn,
                preferredCities,
                workModes
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/readiness (20% weight)
router.put('/readiness', requireAuth, validate(readinessSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { availability, skills } = req.body;
        const normalizedSkills = normalizeSkills(skills);

        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                availability,
                skills: normalizedSkills
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

router.get('/completion', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await prisma.profile.findUnique({
            where: { userId: req.userId }
        });

        if (!profile) {
            return next(new AppError('Profile not found', 404));
        }

        res.json({
            completionPercentage: profile.completionPercentage,
            isComplete: profile.completionPercentage === 100
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/push-token
router.post('/push-token', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, platform } = req.body;
        if (!token) {
            return next(new AppError('Push token is required', 400));
        }

        // We use PushSubscription model. For Expo, we store token in endpoint
        // and set a flag in p256dh to distinguish from Web Push
        await prisma.pushSubscription.upsert({
            where: { userId: req.userId as string },
            create: {
                userId: req.userId as string,
                endpoint: token,
                p256dh: platform === 'expo' ? 'EXPO' : 'NATIVE',
                auth: 'NONE',
                userAgent: req.headers['user-agent']
            },
            update: {
                endpoint: token,
                p256dh: platform === 'expo' ? 'EXPO' : 'NATIVE',
                userAgent: req.headers['user-agent']
            }
        });

        res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
        next(error);
    }
});

// GET /api/profile/contributions
router.get('/contributions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const contributions = await prisma.rawOpportunity.findMany({
            where: { createdByUserId: userId },
            include: {
                mappedOpportunity: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        status: true,
                        publishedAt: true,
                        expiredAt: true,
                        clicksCount: true,
                        savesCount: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const total = await prisma.rawOpportunity.count({ where: { createdByUserId: userId } });
        
        // Fetch stats for the header
        const totalContributed = total;
        const totalPublished = await prisma.opportunity.count({
            where: { 
                rawIngestions: { some: { createdByUserId: userId } },
                status: 'PUBLISHED'
            }
        });

        res.json({
            contributions,
            stats: {
                totalContributed,
                totalPublished,
                approvalRate: totalContributed > 0 ? Math.round((totalPublished / totalContributed) * 100) : 0
            },
            page,
            total,
            hasMore: skip + contributions.length < total
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/contributions
router.post('/contributions', optionalAuth, validate(contributionSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url: rawUrl, referral } = req.body;
        const userId = req.userId;

        const url = rawUrl ? normalizeOpportunityUrl(rawUrl) : null;

        if (url) {
            // Robust duplicate check: search for the normalized URL OR 
            // if it's a major platform, search for the unique ID part
            const searchConditions: Prisma.OpportunityWhereInput[] = [
                { sourceLink: url },
                { applyLink: url }
            ];

            // For LinkedIn, also try to match the ID pattern to catch unnormalized old data
            const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
            if (linkedinMatch) {
                searchConditions.push({ sourceLink: { contains: linkedinMatch[1] } });
                searchConditions.push({ applyLink: { contains: linkedinMatch[1] } });
            }

            // For Naukri
            const naukriMatch = url.match(/naukri\.com\/job-listings-(\d+)/);
            if (naukriMatch) {
                searchConditions.push({ sourceLink: { contains: naukriMatch[1] } });
                searchConditions.push({ applyLink: { contains: naukriMatch[1] } });
            }

            // Check for existing opportunity
            const existingOp = await prisma.opportunity.findFirst({
                where: { 
                    OR: searchConditions,
                    deletedAt: null
                }
            });

            if (existingOp) {
                return res.status(409).json({ error: 'This opportunity is already live on FresherFlow' });
            }

            // Check for existing raw contribution
            const existingRaw = await prisma.rawOpportunity.findFirst({
                where: { 
                    OR: searchConditions as Prisma.RawOpportunityWhereInput[]
                }
            });

            if (existingRaw) {
                return res.status(409).json({ error: 'This link has already been submitted and is under review' });
            }
        }

        // Get or create crowdsourced ingestion source
        let ingestionSource = await prisma.ingestionSource.findFirst({
            where: { name: 'Crowdsourced Links' }
        });

        if (!ingestionSource) {
            try {
                ingestionSource = await prisma.ingestionSource.create({
                    data: {
                        name: 'Crowdsourced Links',
                        sourceType: 'CUSTOM',
                        endpoint: 'Internal Submissions',
                        defaultType: 'JOB',
                    }
                });
            } catch {
                // Handle race condition if two users submit simultaneously
                ingestionSource = await prisma.ingestionSource.findFirst({
                    where: { name: 'Crowdsourced Links' }
                });
            }
        }

        if (!ingestionSource) {
            throw new AppError('Could not resolve ingestion source', 500);
        }

        const contribution = await prisma.rawOpportunity.create({
            data: {
                sourceId: ingestionSource.id as string,
                sourceLink: url,
                status: 'FETCHED',
                reasonFlags: referral ? ['USER_REFERRAL'] : ['USER_CONTRIBUTED'],
                createdByUserId: userId,
                rawPayload: { 
                    url: url, 
                    originalUrl: rawUrl,
                    referral: referral, // New field
                    submittedAt: new Date().toISOString() 
                }
            }
        });

        // Notify via Telegram (async)
        if (url) {
            void TelegramService.notifyJobSubmission(url, userId ? `user:${userId}` : 'anonymous');
        } else if (referral) {
            // Custom notification for referrals
            void TelegramService.notifyJobSubmission(`REFERRAL: ${referral.company}`, userId ? `user:${userId}` : 'anonymous');
        }

        res.status(201).json({ 
            success: true, 
            message: 'Contribution received! Our team will review and publish it soon.',
            contribution
        });
    } catch (error) {
        next(error);
    }
});

export default router;


