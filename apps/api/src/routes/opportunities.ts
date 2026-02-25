import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { OpportunityStatus, OpportunityType, Prisma } from '@prisma/client';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { filterOpportunitiesForUser, rankOpportunitiesForUser, checkEligibility } from '../domain/eligibility';
import { verifyAccessToken } from '@fresherflow/auth';
import { createRateLimiter } from '../middleware/rateLimit';

const router: Router = express.Router();

const publicFeedLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 80,
    message: 'Too many feed requests. Please try again in a minute.',
    keyPrefix: 'opportunities_public',
});
const GUEST_FEED_LIMIT = Number(process.env.GUEST_FEED_LIMIT || 12);

function buildGuestOpportunitySelect() {
    return {
        id: true,
        slug: true,
        type: true,
        title: true,
        company: true,
        locations: true,
        workMode: true,
        salaryMin: true,
        salaryMax: true,
        salaryRange: true,
        salaryPeriod: true,
        employmentType: true,
        expiresAt: true,
        postedAt: true,
        linkHealth: true,
        events: {
            orderBy: { eventDate: 'asc' as const },
            select: {
                id: true,
                eventType: true,
                eventDate: true,
                title: true,
                sourceLink: true,
            }
        }
    } as const;
}

function buildPublicOpportunitySelect(userId?: string) {
    return {
        id: true,
        slug: true,
        type: true,
        title: true,
        company: true,
        companyWebsite: true,
        description: true,
        allowedDegrees: true,
        allowedCourses: true,
        allowedSpecializations: true,
        allowedPassoutYears: true,
        passoutYearMin: true,
        passoutYearMax: true,
        allowedAvailability: true,
        requiredSkills: true,
        locations: true,
        experienceMin: true,
        experienceMax: true,
        workMode: true,
        salaryMin: true,
        salaryMax: true,
        salaryRange: true,
        salaryPeriod: true,
        incentives: true,
        jobFunction: true,
        selectionProcess: true,
        notesHighlights: true,
        stipend: true,
        employmentType: true,
        applyLink: true,
        expiresAt: true,
        postedAt: true,
        linkHealth: true,
        verificationFailures: true,
        lastVerifiedAt: true,
        lastVerified: true,
        events: {
            orderBy: { eventDate: 'asc' as const },
            select: {
                id: true,
                opportunityId: true,
                eventType: true,
                eventDate: true,
                title: true,
                notes: true,
                sourceLink: true,
                createdAt: true,
                updatedAt: true,
            }
        },
        walkInDetails: {
            select: {
                dates: true,
                dateRange: true,
                timeRange: true,
                venueAddress: true,
                venueLink: true,
                reportingTime: true,
                requiredDocuments: true,
                contactPerson: true,
                contactPhone: true,
            },
        },
        ...(userId
            ? {
                actions: {
                    where: { userId },
                    select: {
                        actionType: true,
                        updatedAt: true,
                    },
                },
                savedBy: {
                    where: { userId },
                    select: { id: true },
                    take: 1,
                },
            }
            : {}),
    } as const;
}

function normalizeTypeParam(raw?: string) {
    if (!raw) return undefined;
    const value = raw.toLowerCase();
    if (value === 'job' || value === 'jobs') return 'JOB';
    if (value === 'internship' || value === 'internships') return 'INTERNSHIP';
    if (value === 'walk-in' || value === 'walkin' || value === 'walkins' || value === 'walk-ins') return 'WALKIN';
    return raw.toUpperCase();
}

function parseOpportunityType(raw?: string): OpportunityType | undefined {
    const normalized = normalizeTypeParam(raw);
    if (!normalized) return undefined;
    if (normalized === OpportunityType.JOB) return OpportunityType.JOB;
    if (normalized === OpportunityType.INTERNSHIP) return OpportunityType.INTERNSHIP;
    if (normalized === OpportunityType.WALKIN) return OpportunityType.WALKIN;
    return undefined;
}

function getFreshnessScore(
    opportunity: { postedAt?: Date | string; expiresAt?: Date | string | null; actions?: Array<{ actionType: string }> },
    daySeed: number
) {
    const now = Date.now();
    const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt).getTime() : now;
    const ageHours = Math.max(0, (now - postedAt) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, 100 - ageHours);

    const hasViewed = (opportunity.actions || []).some((a) => a.actionType === 'VIEWED');
    const unseenScore = hasViewed ? 0 : 40;

    const expiryScore = (() => {
        if (!opportunity.expiresAt) return 8;
        const hrs = (new Date(opportunity.expiresAt).getTime() - now) / (1000 * 60 * 60);
        if (hrs <= 0) return -30;
        if (hrs <= 24) return 26;
        if (hrs <= 72) return 18;
        if (hrs <= 168) return 10;
        return 4;
    })();

    const stableNoise = (daySeed % 17) * 0.37;
    return recencyScore + unseenScore + expiryScore + stableNoise;
}

router.get('/', publicFeedLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, city, relevanceDebug, minSalary, maxSalary, page = '1', limit = '50', sort } = req.query;
        const filterType = parseOpportunityType(type as string | undefined);
        const minSal = minSalary ? parseInt(minSalary as string) : undefined;
        const maxSal = maxSalary ? parseInt(maxSalary as string) : undefined;
        const p = parseInt(page as string) || 1;
        const l = parseInt(limit as string) || 50;
        const sortKey = String(sort || '').toLowerCase();

        const user = req.userId ? await prisma.user.findUnique({
            where: { id: req.userId },
            include: { profile: true }
        }) : null;

        const isAdmin = user?.role === 'ADMIN';
        const profile = user?.profile;
        const userId = req.userId;
        const isGuest = !userId;

        const andConditions: Prisma.OpportunityWhereInput[] = [
            {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        ];
        if (minSal !== undefined) {
            andConditions.push({
                OR: [
                    { salaryMin: { gte: minSal } },
                    { salaryMax: { gte: minSal } }
                ]
            });
        }
        if (maxSal !== undefined) {
            andConditions.push({ salaryMin: { lte: maxSal } });
        }

        const whereClause: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            AND: andConditions,
            ...(filterType ? { type: filterType } : {}),
            ...(city ? { locations: { has: city as string } } : {}),
        };

        const totalAvailable = await prisma.opportunity.count({ where: whereClause });
        const effectiveLimit = isGuest ? Math.min(l, GUEST_FEED_LIMIT) : l;
        const effectivePage = isGuest ? 1 : p;
        const effectiveSkip = isGuest ? 0 : (p - 1) * effectiveLimit;

        const dbFiltered = isGuest
            ? await prisma.opportunity.findMany({
                where: whereClause,
                select: buildGuestOpportunitySelect(),
                orderBy: { postedAt: 'desc' },
                take: effectiveLimit,
                skip: 0
            })
            : await prisma.opportunity.findMany({
                where: whereClause,
                select: buildPublicOpportunitySelect(userId || undefined),
                orderBy: { postedAt: 'desc' },
                take: effectiveLimit,
                skip: effectiveSkip
            });

        const mappedResults = dbFiltered.map((opp: any) => {
            const { savedBy, ...rest } = opp;
            return {
                ...rest,
                isSaved: Boolean(savedBy && savedBy.length > 0)
            };
        });

        let finalResults: any[] = mappedResults;
        if (!isAdmin && profile) {
            finalResults = filterOpportunitiesForUser(mappedResults as any, profile as any);
        }

        const includeRelevanceDebug = isAdmin && relevanceDebug === 'true' && Boolean(profile);
        let sorted = finalResults as any[];
        let debug: any[] | undefined;

        if (profile) {
            const ranked = rankOpportunitiesForUser(finalResults as any, profile as any);
            sorted = ranked.map((item) => item.opportunity);
            if (includeRelevanceDebug) {
                debug = ranked.map((item) => ({
                    opportunityId: item.opportunity.id,
                    title: item.opportunity.title,
                    company: item.opportunity.company,
                    score: item.score,
                    breakdown: item.breakdown,
                }));
            }
        }

        if (sortKey === 'freshness_v2') {
            const daySeed = Number(`${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${userId || '0'}`.slice(-6));
            sorted = [...sorted].sort((a: any, b: any) => getFreshnessScore(b, daySeed) - getFreshnessScore(a, daySeed));
        }

        res.json({
            opportunities: sorted,
            count: sorted.length,
            total: isGuest ? Math.min(totalAvailable, GUEST_FEED_LIMIT) : totalAvailable,
            page: effectivePage,
            limit: effectiveLimit,
            guestTeaser: isGuest,
            requiresAuthForFullFeed: isGuest,
            ...(includeRelevanceDebug ? { relevanceDebug: debug } : {})
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/events', publicFeedLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id || '');
        if (!id) throw new AppError('Opportunity id is required', 400);

        const opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [{ id }, { slug: id }],
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            },
            select: { id: true }
        });

        if (!opportunity) throw new AppError('Opportunity not found', 404);

        const events = await prisma.opportunityEvent.findMany({
            where: { opportunityId: opportunity.id },
            orderBy: { eventDate: 'asc' }
        });

        res.json({ events });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', publicFeedLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: rawId } = req.params as { id: string };
        const decodeSafe = (value: string) => {
            try { return decodeURIComponent(value); } catch { return value; }
        };
        const normalizeId = (value: string) => {
            const decoded = decodeSafe(value).trim();
            if (/^https?:\/\//i.test(decoded)) {
                try {
                    const url = new URL(decoded);
                    const pathSegments = url.pathname.split('/').filter(Boolean);
                    return pathSegments[pathSegments.length - 1] || decoded;
                } catch {
                    return decoded.replace(/^https?:\/+/i, '');
                }
            }
            return decoded;
        };
        const id = normalizeId(rawId);
        const token = req.cookies.accessToken;
        const userId = token ? verifyAccessToken(token) : null;

        const extractSlugSuffix = (value: string) => {
            const parts = value.split('-').filter(Boolean);
            const last = parts[parts.length - 1] || '';
            return /^[a-f0-9]{6,12}$/i.test(last) ? last.toLowerCase() : '';
        };

        let opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [{ slug: id }, { id: id }],
                deletedAt: null
            },
            select: buildPublicOpportunitySelect(userId || undefined)
        });

        if (!opportunity) {
            const suffix = extractSlugSuffix(id);
            if (suffix) {
                opportunity = await prisma.opportunity.findFirst({
                    where: {
                        id: { endsWith: suffix },
                        deletedAt: null
                    },
                    select: buildPublicOpportunitySelect(userId || undefined)
                });
            }
        }

        if (!opportunity) {
            return next(new AppError('Opportunity not found', 404));
        }

        if (userId) {
            res.setHeader('Cache-Control', 'private, no-store');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        }

        const { savedBy, ...opportunitySafe } = opportunity as typeof opportunity & { savedBy?: Array<{ id: string }> };
        const opportunityWithSaved = {
            ...opportunitySafe,
            isSaved: Boolean(savedBy && savedBy.length > 0)
        };

        let isEligible = true;
        let eligibilityReason: string | undefined;

        if (userId) {
            const profile = await prisma.profile.findUnique({ where: { userId } });
            if (profile) {
                const result = checkEligibility(opportunity as any, profile as any, userId);
                isEligible = result.eligible;
                eligibilityReason = result.reason;
            }
        }

        res.json({
            opportunity: opportunityWithSaved,
            isEligible,
            eligibilityReason
        });
    } catch (error) {
        next(error);
    }
});

export default router;
