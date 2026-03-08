import express, { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { env } from '@fresherflow/config';
import { logger } from '@fresherflow/logger';
import { redis } from '@fresherflow/redis';
import prisma from '../lib/prisma';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { OpportunityService } from '../domain/opportunity';
import { EligibilityService, filterOpportunitiesForUser, rankOpportunitiesForUser, checkEligibility } from '../domain/eligibility';
import { verifyAccessToken } from '@fresherflow/auth';
import { createRateLimiter } from '../middleware/rateLimit';

const router: Router = express.Router();

const publicFeedLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 80,
    message: 'Too many feed requests. Please try again in a minute.',
    keyPrefix: 'opportunities_public',
});
const publicFeedBotLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 25,
    message: 'Too many automated feed requests. Please slow down.',
    keyPrefix: 'opportunities_public_bot',
});
const publicDetailLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many detail requests. Please try again in a minute.',
    keyPrefix: 'opportunity_detail',
});
const publicDetailBotLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 35,
    message: 'Too many automated detail requests. Please slow down.',
    keyPrefix: 'opportunity_detail_bot',
});
const GUEST_FEED_LIMIT = 12;
const MAX_FEED_LIMIT = 100;
const MAX_FEED_PAGE = 200;
const GUEST_FEED_CACHE_TTL_SECONDS = 300;
const GUEST_DETAIL_CACHE_TTL_SECONDS = 300;
const MAX_DETAIL_ID_LENGTH = 200;
const MAX_SALARY_FILTER = 100000000;
const ALLOWED_SORT_KEYS = new Set(['', 'freshness_v2']);

const BOT_UA_REGEX = /(bot|crawler|spider|scraper|curl|wget|python-requests|axios|headless|preview|slurp|facebookexternalhit|whatsapp|telegrambot|linkedinbot|discordbot)/i;
// Redis client is now globally managed by @fresherflow/redis

function isLikelyBotTraffic(req: Request): boolean {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    if (!ua) return true;
    if (BOT_UA_REGEX.test(ua)) return true;

    const acceptLanguage = String(req.headers['accept-language'] || '').trim();
    const secFetchMode = String(req.headers['sec-fetch-mode'] || '').trim().toLowerCase();
    return !acceptLanguage && secFetchMode !== 'navigate';
}

function adaptiveFeedLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) {
        return publicFeedBotLimiter(req, res, next);
    }
    return publicFeedLimiter(req, res, next);
}

function adaptiveDetailLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) {
        return publicDetailBotLimiter(req, res, next);
    }
    return publicDetailLimiter(req, res, next);
}

function tryResolveUserIdFromCookie(req: Request): string | null {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
        return verifyAccessToken(token);
    } catch {
        return null;
    }
}

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

function normalizeSafeQueryString(value: unknown, maxLen = 80) {
    return String(value || '').trim().slice(0, maxLen);
}

function parseStrictPositiveInt(value: unknown): number | null {
    const raw = String(value ?? '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function isSupportedDetailId(value: string) {
    if (!value || value.length > MAX_DETAIL_ID_LENGTH) return false;
    return /^[a-zA-Z0-9\-_.:/%]+$/.test(value);
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

router.get('/search', adaptiveFeedLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, type, city, page = '1', limit = '20' } = req.query;
        const query = typeof q === 'string' ? q : '';
        const typeValue = normalizeSafeQueryString(type, 24);
        const cityValue = normalizeSafeQueryString(city, 80);
        const p = parseStrictPositiveInt(page) ?? 1;
        const l = parseStrictPositiveInt(limit) ?? 20;

        if (p < 1 || p > 100) throw new AppError('Invalid page', 400);
        if (l < 1 || l > 50) throw new AppError('Invalid limit', 400);

        const filterType = parseOpportunityType(typeValue || undefined);
        const locations = cityValue ? [cityValue] : undefined;

        const offset = (p - 1) * l;

        const searchResults = await OpportunityService.searchOpportunities(query, {
            filterType,
            limit: l,
            offset,
            locations
        });

        res.setHeader('Cache-Control', 'private, no-store');

        return res.json({
            hits: searchResults.hits,
            totalHits: searchResults.totalHits,
            processingTimeMs: 0,
            page: p,
            limit: l,
        });

    } catch (error) {
        next(error);
    }
});

router.get('/', adaptiveFeedLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, city, relevanceDebug, minSalary, maxSalary, page = '1', limit = '50', sort } = req.query;
        const typeValue = normalizeSafeQueryString(type, 24);
        const cityValue = normalizeSafeQueryString(city, 80);
        const filterType = parseOpportunityType(typeValue || undefined);
        const minSal = minSalary !== undefined ? parseStrictPositiveInt(minSalary) : undefined;
        const maxSal = maxSalary !== undefined ? parseStrictPositiveInt(maxSalary) : undefined;
        const pageValue = parseStrictPositiveInt(page);
        const limitValue = parseStrictPositiveInt(limit);
        const p = pageValue ?? 1;
        const l = limitValue ?? 50;

        if (pageValue === null || limitValue === null) {
            throw new AppError('Invalid pagination params', 400);
        }
        if (minSalary !== undefined && minSal === null) {
            throw new AppError('Invalid minSalary filter', 400);
        }
        if (maxSalary !== undefined && maxSal === null) {
            throw new AppError('Invalid maxSalary filter', 400);
        }

        if (p < 1 || p > MAX_FEED_PAGE) {
            throw new AppError(`Page must be between 1 and ${MAX_FEED_PAGE}`, 400);
        }

        if (l < 1 || l > MAX_FEED_LIMIT) {
            throw new AppError(`Limit must be between 1 and ${MAX_FEED_LIMIT}`, 400);
        }

        const sortKey = normalizeSafeQueryString(sort, 24).toLowerCase();
        if (!ALLOWED_SORT_KEYS.has(sortKey)) {
            throw new AppError(`Unsupported sort '${sortKey}'`, 400);
        }

        if (minSal != null && (minSal < 0 || minSal > MAX_SALARY_FILTER)) {
            throw new AppError('Invalid minSalary filter', 400);
        }

        if (maxSal != null && (maxSal < 0 || maxSal > MAX_SALARY_FILTER)) {
            throw new AppError('Invalid maxSalary filter', 400);
        }

        if (minSal != null && maxSal != null && minSal > maxSal) {
            throw new AppError('minSalary cannot be greater than maxSalary', 400);
        }

        if (isLikelyBotTraffic(req) && p > 20) {
            logger.warn('Potential abusive opportunities feed request blocked', {
                path: req.path,
                page: p,
                limit: l,
                sortKey,
                ua: String(req.headers['user-agent'] || '').slice(0, 160),
                ip: req.ip
            });
            throw new AppError('Page too deep for anonymous access', 400);
        }

        const user = req.userId ? await prisma.user.findUnique({
            where: { id: req.userId },
            include: { profile: true }
        }) : null;

        const isAdmin = user?.role === 'ADMIN';
        const profile = user?.profile;
        const userId = req.userId;
        const isGuest = !userId;
        // Use shared redis from @fresherflow/redis
        const redis_client = env.NODE_ENV === 'development' ? null : redis;

        const andConditions: Prisma.OpportunityWhereInput[] = [
            {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        ];
        if (minSal != null) {
            andConditions.push({
                OR: [
                    { salaryMin: { gte: minSal } },
                    { salaryMax: { gte: minSal } }
                ]
            });
        }
        if (maxSal != null) {
            andConditions.push({ salaryMin: { lte: maxSal } });
        }

        const whereClause: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            AND: andConditions,
            ...(filterType ? { type: filterType } : {}),
            ...(cityValue ? { locations: { has: cityValue } } : {}),
        };

        const guestCacheKey = isGuest
            ? [
                'opportunities',
                'v2',
                `type:${filterType || 'all'}`,
                `city:${cityValue || 'all'}`,
                `min:${minSal ?? 'na'}`,
                `max:${maxSal ?? 'na'}`,
                `sort:${sortKey || 'default'}`,
                `page:${p}`,
                `limit:${Math.min(l, GUEST_FEED_LIMIT)}`,
            ].join('|')
            : null;

        if (isGuest && guestCacheKey && redis_client) {
            try {
                const cached = await redis_client.get(guestCacheKey);
                if (cached) {
                    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
                    res.setHeader('Vary', 'Cookie, Authorization');
                    res.setHeader('X-Feed-Cache', 'HIT');
                    return res.json(JSON.parse(cached));
                }
            } catch {
                // Cache read failures should never break feed responses.
            }
        }

        const totalAvailable = isGuest ? undefined : await prisma.opportunity.count({ where: whereClause });
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

        if (isGuest) {
            // Public feed traffic (bots/previews) should be edge-cached.
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
            res.setHeader('X-Feed-Cache', 'MISS');
        } else {
            res.setHeader('Cache-Control', 'private, no-store');
        }
        res.setHeader('Vary', 'Cookie, Authorization');

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

        const responsePayload = {
            opportunities: sorted,
            count: sorted.length,
            total: isGuest ? sorted.length : totalAvailable,
            page: effectivePage,
            limit: effectiveLimit,
            guestTeaser: isGuest,
            requiresAuthForFullFeed: isGuest,
            ...(includeRelevanceDebug ? { relevanceDebug: debug } : {})
        };

        if (isGuest && guestCacheKey && redis_client) {
            try {
                await redis_client.setex(guestCacheKey, GUEST_FEED_CACHE_TTL_SECONDS, JSON.stringify(responsePayload));
            } catch {
                // Cache write failures should never break feed responses.
            }
        }

        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/events', adaptiveDetailLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id || '');
        if (!id || !isSupportedDetailId(id)) throw new AppError('Opportunity id is invalid', 400);

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

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Vary', 'Cookie, Authorization');
        res.json({ events });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', adaptiveDetailLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
        if (!isSupportedDetailId(id)) {
            throw new AppError('Opportunity id is invalid', 400);
        }
        const userId = tryResolveUserIdFromCookie(req);
        const isGuest = !userId;
        // Use shared redis from @fresherflow/redis
        const redis_client = env.NODE_ENV === 'development' ? null : redis;
        const guestDetailCacheKey = isGuest ? `opportunity_detail|v1|id:${id}` : null;

        if (isGuest && guestDetailCacheKey && redis_client) {
            try {
                const cached = await redis_client.get(guestDetailCacheKey);
                if (cached) {
                    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
                    res.setHeader('Vary', 'Cookie, Authorization');
                    res.setHeader('X-Detail-Cache', 'HIT');
                    return res.json(JSON.parse(cached));
                }
            } catch {
                // Cache read failures should never break detail responses.
            }
        }

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
            res.setHeader('X-Detail-Cache', 'MISS');
        }
        res.setHeader('Vary', 'Cookie, Authorization');

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

        const responsePayload = {
            opportunity: opportunityWithSaved,
            isEligible,
            eligibilityReason
        };

        if (isGuest && guestDetailCacheKey && redis_client) {
            try {
                await redis_client.setex(guestDetailCacheKey, GUEST_DETAIL_CACHE_TTL_SECONDS, JSON.stringify(responsePayload));
            } catch {
                // Cache write failures should never break detail responses.
            }
        }

        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

export default router;
