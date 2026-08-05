import { Router, Request, Response, NextFunction } from 'express';
import { prisma, OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType, EducationLevel as DbEducationLevel, WorkMode as DbWorkMode, SalaryPeriod as DbSalaryPeriod } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';
import { tryResolveUserIdFromCookie } from './_helpers';
import { opportunitySubmitSchema } from '../../../utils/validation';
import { adminCache } from '../../../infrastructure/cache/adminCache';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/opportunities/submit
 * Public endpoint to submit a parsed opportunity for moderation.
 */
router.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. API Key Auth check
        const apiKey = req.headers['x-api-key'];
        const secret = process.env.INTERNAL_API_SECRET;
        let attributionUserId: string | null = null;
        const isApiKeyRequest = !!apiKey;

        if (isApiKeyRequest) {
            if (!secret) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: Invalid API Key'
                });
            }

            const keyStr = String(apiKey);
            const secretStr = String(secret);

            if (keyStr.length !== secretStr.length || !crypto.timingSafeEqual(Buffer.from(keyStr), Buffer.from(secretStr))) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: Invalid API Key'
                });
            }

            // Find system ADMIN user
            const systemAdmin = await prisma.user.findFirst({
                where: { role: 'ADMIN' }
            });
            if (!systemAdmin) {
                return res.status(500).json({
                    success: false,
                    message: 'System error: No ADMIN user found to attribute post'
                });
            }
            attributionUserId = systemAdmin.id;
        } else {
            // Cookie-based fallback
            const userId = tryResolveUserIdFromCookie(req);
            if (userId) {
                attributionUserId = userId;
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: Authentication required to submit opportunities'
                });
            }
        }

        // 2. Data Validation
        const validationResult = opportunitySubmitSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map(
                err => `${err.path.join('.')}: ${err.message}`
            ).join(', ');
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${errorMessages}`
            });
        }

        const data = validationResult.data;

        // 3. Deduplication Check (on sourceLink and applyLink)
        const urlsToCheck = [data.sourceLink, data.applyLink].filter(
            (url): url is string => typeof url === 'string' && url.length > 0
        );

        if (urlsToCheck.length > 0) {
            const existingOpp = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { sourceLink: { in: urlsToCheck } },
                        { applyLink: { in: urlsToCheck } }
                    ],
                    deletedAt: null
                }
            });

            if (existingOpp) {
                return res.status(200).json({
                    success: true,
                    message: 'Opportunity already exists',
                    id: existingOpp.id
                });
            }
        }

        // 4. Generate Slug
        let slug = slugify(`${data.company} ${data.title}`);
        const existingBySlug = await prisma.opportunity.findFirst({
            where: { slug }
        });
        if (existingBySlug) {
            slug = `${slug}-${crypto.randomInt(0, 1000)}`;
        }

        // 5. Create Opportunity (DRAFT status by default, but adaptable to PUBLISHED if explicitly requested)
        const targetStatus = data.status || OpportunityStatus.DRAFT;

        const opportunity = await prisma.opportunity.create({
            data: {
                slug,
                title: data.title,
                company: data.company,
                companyWebsite: data.companyWebsite,
                companyLogoUrl: data.companyLogoUrl,
                description: data.description || '',
                type: (data.type || OpportunityType.JOB) as unknown as DbOpportunityType,
                status: targetStatus as unknown as DbOpportunityStatus,
                locations: data.locations,
                requiredSkills: data.requiredSkills.length > 0 ? data.requiredSkills : (data.skills || []),
                allowedDegrees: data.allowedDegrees as unknown as DbEducationLevel[],
                allowedCourses: data.allowedCourses,
                allowedSpecializations: data.allowedSpecializations,
                allowedPassoutYears: data.allowedPassoutYears,
                workMode: data.workMode as unknown as DbWorkMode,
                salaryRange: data.salaryRange,
                salaryMin: data.salaryMin,
                salaryMax: data.salaryMax,
                salaryPeriod: data.salaryPeriod as unknown as DbSalaryPeriod,
                stipend: data.stipend,
                employmentType: data.employmentType,
                applyLink: data.applyLink || data.sourceLink,
                sourceLink: data.sourceLink,
                applicationDetails: data.applicationDetails || undefined,
                postedByUserId: attributionUserId as string,
                experienceMin: data.experienceMin ?? null,
                experienceMax: data.experienceMax ?? null,
                structuredLocations: data.structuredLocations ?? undefined,
                jobFunction: data.jobFunction ?? null,
                incentives: data.incentives ?? null,
                selectionProcess: data.selectionProcess ?? null,
                notesHighlights: data.notesHighlights ?? null,
                publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
                ...(data.type === 'WALKIN' ? {
                    walkInDetails: {
                        create: {
                            dates: data.dates ? data.dates.map((d: string) => new Date(d)) : [],
                            dateRange: data.dateRange || '',
                            timeRange: data.timeRange || '',
                            venueAddress: data.venueAddress || '',
                            venueLink: data.venueLink || '',
                            reportingTime: data.reportingTime || data.timeRange || '',
                            requiredDocuments: [],
                        }
                    }
                } : {})
            }
        });

        // Invalidate admin listing cache so new jobs show up immediately
        adminCache.invalidateLists();

        return res.status(200).json({
            success: true,
            message: 'Opportunity submitted successfully',
            id: opportunity.id
        });
    } catch (error) {
        next(error);
    }
});

export default router;
