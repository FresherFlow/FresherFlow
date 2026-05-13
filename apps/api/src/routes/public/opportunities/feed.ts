import { Router, Request, Response, NextFunction } from 'express';
import { Prisma, OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType, Profile, Opportunity } from '@fresherflow/types';
import { env } from '@fresherflow/config';
import { logger } from '@fresherflow/logger';
import { redis } from '@fresherflow/redis';
import prisma from '../../../infrastructure/database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { filterAndRankOpportunitiesForUser, rankOpportunitiesForUser } from '@fresherflow/domain';
import {
    isLikelyBotTraffic, publicFeedLimiter, publicFeedBotLimiter,
    GUEST_FEED_LIMIT, MAX_FEED_LIMIT, MAX_FEED_PAGE, GUEST_FEED_CACHE_TTL_SECONDS,
    normalizeSafeQueryString, parseStrictPositiveInt, ALLOWED_SORT_KEYS, MAX_SALARY_FILTER,
    buildGuestOpportunitySelect, buildPublicOpportunitySelect, getFreshnessScore, parseSiteMode,
    GUEST_FEED_CACHE_CONTROL
} from './_helpers';

const router: Router = Router();

function adaptiveFeedLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) return publicFeedBotLimiter(req, res, next);
    return publicFeedLimiter(req, res, next);
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

router.get('/', adaptiveFeedLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, city, tag, relevanceDebug, minSalary, maxSalary, company, closingSoon, page = '1', limit = '50', sort, siteMode, feedType } = req.query;
        const typeValue = normalizeSafeQueryString(type, 24);
        const cityValue = normalizeSafeQueryString(city, 80);
        const tagValue = normalizeSafeQueryString(tag, 80);
        const companyValue = normalizeSafeQueryString(company, 100);
        const closingSoonValue = closingSoon === 'true';
        const effectiveSiteMode = parseSiteMode(siteMode as string);
        const filterType = parseOpportunityType(typeValue || undefined);
        const minSal = minSalary !== undefined ? parseStrictPositiveInt(minSalary) : undefined;
        const maxSal = maxSalary !== undefined ? parseStrictPositiveInt(maxSalary) : undefined;
        const pageValue = parseStrictPositiveInt(page);
        const limitValue = parseStrictPositiveInt(limit);
        const p = pageValue ?? 1;
        const l = limitValue ?? 50;

        if (pageValue === null || limitValue === null) throw new AppError('Invalid pagination params', 400);
        if (minSalary !== undefined && minSal === null) throw new AppError('Invalid minSalary filter', 400);
        if (maxSalary !== undefined && maxSal === null) throw new AppError('Invalid maxSalary filter', 400);

        if (p < 1 || p > MAX_FEED_PAGE) throw new AppError(`Page must be between 1 and ${MAX_FEED_PAGE}`, 400);
        if (l < 1 || l > MAX_FEED_LIMIT) throw new AppError(`Limit must be between 1 and ${MAX_FEED_LIMIT}`, 400);

        const sortKey = normalizeSafeQueryString(sort, 24).toLowerCase() || (feedType === 'trending' ? 'trending' : 'default');
        if (!ALLOWED_SORT_KEYS.has(sortKey) && sortKey !== 'trending' && sortKey !== 'default') throw new AppError(`Unsupported sort '${sortKey}'`, 400);

        if (minSal != null && (minSal < 0 || minSal > MAX_SALARY_FILTER)) throw new AppError('Invalid minSalary filter', 400);
        if (maxSal != null && (maxSal < 0 || maxSal > MAX_SALARY_FILTER)) throw new AppError('Invalid maxSalary filter', 400);
        if (minSal != null && maxSal != null && minSal > maxSal) throw new AppError('minSalary cannot be greater than maxSalary', 400);

        if (isLikelyBotTraffic(req) && p > 20) {
            logger.warn('Potential abusive feed request blocked', { path: req.path, page: p, ua: req.headers['user-agent'], ip: req.ip });
            throw new AppError('Page too deep for anonymous access', 400);
        }

        const userId = req.userId;
        const user = userId ? await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }) : null;
        const isAdmin = user?.role === 'ADMIN';
        const profile = user?.profile;
        const isGuest = !userId;
        const redis_client = env.NODE_ENV === 'development' ? null : redis;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const andConditions: Prisma.OpportunityWhereInput[] = [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            { postedAt: { gte: oneMonthAgo } } // Lightweight 30-day expiry
        ];
        if (minSal != null) andConditions.push({ OR: [{ salaryMin: { gte: minSal } }, { salaryMax: { gte: minSal } }] });
        if (maxSal != null) andConditions.push({ salaryMin: { lte: maxSal } });

        // Feed Type Specific Logic (Item 94-99 in plan)
        if (feedType === 'remote') {
            andConditions.push({ workMode: 'REMOTE' });
        } else if (feedType === '2026') {
            andConditions.push({ allowedPassoutYears: { has: 2026 } });
        } else if (feedType === 'internships') {
            andConditions.push({ type: 'INTERNSHIP' });
        } else if (feedType === 'walkins') {
            andConditions.push({ type: 'WALKIN' });
        }

        const whereClause: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
            deletedAt: null,
            AND: andConditions,
            ...(effectiveSiteMode === 'govt'
                ? { governmentJobDetails: { isNot: null } }
                : { governmentJobDetails: { is: null } }),
            ...(filterType ? { type: filterType as unknown as DbOpportunityType } : {}),
            ...(cityValue ? { locations: { has: cityValue } } : {}),
            ...(tagValue ? { tags: { has: tagValue } } : {}),
            ...(companyValue ? { company: { equals: companyValue, mode: 'insensitive' } } : {}),
            ...(closingSoonValue ? { expiresAt: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } } : {}),
        };

        const effectiveGuestPage = 1;
        const effectiveGuestLimit = Math.min(l, GUEST_FEED_LIMIT);
        const guestCacheKey = isGuest
            ? ['opportunities', 'v5', `mode:${effectiveSiteMode}`, `feed:${feedType || 'all'}`, `type:${filterType || 'all'}`, `city:${cityValue || 'all'}`, `tag:${tagValue || 'all'}`, `min:${minSal ?? 'na'}`, `max:${maxSal ?? 'na'}`, `sort:${sortKey || 'default'}`, `page:${effectiveGuestPage}`, `limit:${effectiveGuestLimit}`].join('|')
            : null;

        if (isGuest && guestCacheKey && redis_client) {
            const cached = await redis_client.get(guestCacheKey).catch(() => null);
            if (cached) {
                res.setHeader('Cache-Control', GUEST_FEED_CACHE_CONTROL);
                res.setHeader('X-Feed-Cache', 'HIT');
                return res.json(JSON.parse(cached));
            }
        }

        const effectiveLimit = isGuest ? effectiveGuestLimit : l;
        const effectiveSkip = isGuest ? 0 : (p - 1) * effectiveLimit;
        const shouldIncludeExactTotal = !isGuest && p === 1;

        const fetchMultiplier = profile && !isAdmin ? 3 : 1;
        const fetchLimit = Math.min(effectiveLimit * fetchMultiplier, MAX_FEED_LIMIT * fetchMultiplier);

        const [totalAvailable, dbFiltered] = await Promise.all([
            shouldIncludeExactTotal ? prisma.opportunity.count({ where: whereClause }) : Promise.resolve<number | undefined>(undefined),
            prisma.opportunity.findMany({
                where: whereClause,
                select: isGuest ? buildGuestOpportunitySelect() : buildPublicOpportunitySelect(userId),
                orderBy: sortKey === 'trending' ? { trendingScore: 'desc' } : { postedAt: 'desc' },
                distinct: ['id'],
                take: fetchLimit,
                skip: effectiveSkip
            })
        ]);

        const mappedResults = (dbFiltered as unknown as (Opportunity & { savedBy?: unknown[] })[]).map((opp) => {
            const { savedBy, ...rest } = opp;
            return { ...rest, isSaved: Boolean(savedBy && (savedBy as unknown[]).length > 0) } as unknown as Opportunity;
        });

        if (isGuest) {
            res.setHeader('Cache-Control', GUEST_FEED_CACHE_CONTROL);
            res.setHeader('X-Feed-Cache', 'MISS');
        } else {
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('Vary', 'Cookie, Authorization');
        }

        let finalResults = mappedResults;
        if (!isAdmin && profile) {
            const ranked = filterAndRankOpportunitiesForUser(
                mappedResults,
                profile as unknown as Profile,
                userId || undefined
            );
            finalResults = ranked.slice(0, effectiveLimit).map((item) => ({
                ...item.opportunity,
                matchScore: item.score,
            })) as unknown as Opportunity[];
        }

        const includeRelevanceDebug = isAdmin && relevanceDebug === 'true' && Boolean(profile);
        let sorted = finalResults;
        let debug: { opportunityId: string; title: string; score: number; breakdown: unknown }[] | undefined;

        if (profile && isAdmin) {
            const ranked = rankOpportunitiesForUser(finalResults, profile as unknown as Profile);
            sorted = ranked.map((item) => item.opportunity);
            if (includeRelevanceDebug) {
                debug = ranked.map((item) => ({
                    opportunityId: item.opportunity.id,
                    title: item.opportunity.title,
                    score: item.score,
                    breakdown: item.breakdown,
                }));
            }
        }

        // Apply specialized sorting after filtering
        if (sortKey === 'freshness_v2') {
            const daySeed = Number(`${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${userId || '0'}`.slice(-6));
            sorted = [...sorted].sort((a, b) => getFreshnessScore(b as unknown as Opportunity, daySeed) - getFreshnessScore(a as unknown as Opportunity, daySeed));
        } else if (sortKey === 'trending') {
            // Already sorted by trendingScore in DB if possible, but refined here if filtered
            sorted = [...sorted].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
        }

        const responsePayload = {
            opportunities: sorted,
            count: sorted.length,
            total: isGuest ? sorted.length : totalAvailable,
            page: isGuest ? effectiveGuestPage : p,
            limit: effectiveLimit,
            guestTeaser: isGuest,
            requiresAuthForFullFeed: isGuest,
            ...(includeRelevanceDebug ? { relevanceDebug: debug } : {})
        };

        if (isGuest && guestCacheKey && redis_client) {
            await redis_client.setex(guestCacheKey, GUEST_FEED_CACHE_TTL_SECONDS, JSON.stringify(responsePayload)).catch(() => null);
        }

        return res.json(responsePayload);
    } catch (e) {
        next(e);
    }
});

export default router;
