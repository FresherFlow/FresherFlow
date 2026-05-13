import { Router, Request, Response, NextFunction } from 'express';
import { prisma, OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType, EducationLevel as DbEducationLevel, WorkMode as DbWorkMode, SalaryPeriod as DbSalaryPeriod } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType, EducationLevel, WorkMode, SalaryPeriod } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';
import { tryResolveUserIdFromCookie } from './_helpers';

const router = Router();

/**
 * POST /api/opportunities/submit
 * Public endpoint to submit a parsed opportunity for moderation.
 */
router.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const userId = tryResolveUserIdFromCookie(req);

        if (!data.title || !data.company) {
            return res.status(400).json({ message: 'Title and Company are required' });
        }

        // 1. Generate slug
        let slug = slugify(`${data.company} ${data.title}`);

        // 2. Check for existing opportunities with this URL (Deduplication)
        const normalizedUrl = data.sourceLink || data.applyLink;
        if (normalizedUrl) {
            const existingOpp = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { sourceLink: normalizedUrl },
                        { applyLink: normalizedUrl }
                    ],
                    deletedAt: null
                }
            });

            if (existingOpp) {
                return res.json({
                    success: true,
                    message: 'Opportunity already exists!',
                    id: existingOpp.id,
                    existing: true
                });
            }
        }

        // 3. Handle slug duplicates (fallback)
        const existingBySlug = await prisma.opportunity.findFirst({
            where: { slug }
        });
        if (existingBySlug) {
            slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
        }

        // 3. Find an attribution user (logged in user or first admin)
        const systemUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!systemUser && !userId) {
            return res.status(500).json({ message: 'System error: No user found to attribute post' });
        }

        const attributionUserId = userId || systemUser?.id;
        if (!attributionUserId) {
            return res.status(500).json({ message: 'Could not resolve attribution user' });
        }

        // 4. Create Draft Opportunity
        const opportunity = await prisma.opportunity.create({
            data: {
                slug,
                title: data.title,
                company: data.company,
                description: data.description || '',
                type: ((data.type as OpportunityType) || OpportunityType.JOB) as unknown as DbOpportunityType,
                status: OpportunityStatus.DRAFT as unknown as DbOpportunityStatus,
                locations: data.locations || [],
                requiredSkills: data.requiredSkills || data.skills || [],
                allowedDegrees: ((data.allowedDegrees as EducationLevel[]) || []) as unknown as DbEducationLevel[],
                allowedCourses: data.allowedCourses || [],
                allowedPassoutYears: data.allowedPassoutYears || [],
                workMode: ((data.workMode as WorkMode) || undefined) as unknown as DbWorkMode,
                salaryRange: data.salaryRange,
                salaryMin: data.salaryMin,
                salaryMax: data.salaryMax,
                salaryPeriod: ((data.salaryPeriod as SalaryPeriod) || SalaryPeriod.YEARLY) as unknown as DbSalaryPeriod,
                applyLink: data.applyLink || data.sourceLink,
                sourceLink: data.sourceLink,
                postedByUserId: attributionUserId as string,
                ...(data.type === 'WALKIN' ? {
                    walkInDetails: {
                        create: {
                            dates: data.dates ? data.dates.map((d: string) => new Date(d)) : [],
                            dateRange: data.dateRange,
                            timeRange: data.timeRange,
                            venueAddress: data.venueAddress || '',
                            venueLink: data.venueLink,
                            reportingTime: data.timeRange || '',
                            requiredDocuments: [],
                        }
                    }
                } : {})
            }
        });

        res.json({
            success: true,
            message: 'Opportunity submitted for moderation!',
            id: opportunity.id
        });
    } catch (error) {
        next(error);
    }
});

export default router;
