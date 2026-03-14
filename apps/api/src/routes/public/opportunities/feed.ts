import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { env } from '@fresherflow/config';
import { logger } from '@fresherflow/logger';
import { redis } from '@fresherflow/redis';
import prisma from '../../../lib/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { filterOpportunitiesForUser, rankOpportunitiesForUser } from '../../../domain/eligibility';
import {
    isLikelyBotTraffic, publicFeedLimiter, publicFeedBotLimiter,
    GUEST_FEED_LIMIT, MAX_FEED_LIMIT, MAX_FEED_PAGE, GUEST_FEED_CACHE_TTL_SECONDS,
    normalizeSafeQueryString, parseStrictPositiveInt, ALLOWED_SORT_KEYS, MAX_SALARY_FILTER,
    buildGuestOpportunitySelect, buildPublicOpportunitySelect, getFreshnessScore
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

        if (pageValue === null || limitValue === null) throw new AppError('Invalid pagination params', 400);
        if (minSalary !== undefined && minSal === null) throw new AppError('Invalid minSalary filter', 400);
        if (maxSalary !== undefined && maxSal === null) throw new AppError('Invalid maxSalary filter', 400);

        if (p < 1 || p > MAX_FEED_PAGE) throw new AppError(`Page must be between 1 and ${MAX_FEED_PAGE}`, 400);
        if (l < 1 || l > MAX_FEED_LIMIT) throw new AppError(`Limit must be between 1 and ${MAX_FEED_LIMIT}`, 400);

        const sortKey = normalizeSafeQueryString(sort, 24).toLowerCase();
        if (!ALLOWED_SORT_KEYS.has(sortKey)) throw new AppError(`Unsupported sort '${sortKey}'`, 400);

        if (minSal != null && (minSal < 0 || minSal > MAX_SALARY_FILTER)) throw new AppError('Invalid minSalary filter', 400);
        if (maxSal != null && (maxSal < 0 || maxSal > MAX_SALARY_FILTER)) throw new AppError('Invalid maxSalary filter', 400);
        if (minSal != null && maxSal != null && minSal > maxSal) throw new AppError('minSalary cannot be greater than maxSalary', 400);

        if (isLikelyBotTraffic(req) && p > 20) {
            logger.warn('Potential abusive feed request blocked', { path: req.path, page: p, ua: req.headers['user-agent'], ip: req.ip });
            throw new AppError('Page too deep for anonymous access', 400);
        }

        const userId = (req as any).userId;
        const user = userId ? await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }) : null;
        const isAdmin = user?.role === 'ADMIN';
        const profile = user?.profile;
        const isGuest = !userId;
        const redis_client = env.NODE_ENV === 'development' ? null : redis;

        const andConditions: Prisma.OpportunityWhereInput[] = [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
        ];
        if (minSal != null) andConditions.push({ OR: [{ salaryMin: { gte: minSal } }, { salaryMax: { gte: minSal } }] });
        if (maxSal != null) andConditions.push({ salaryMin: { lte: maxSal } });

        const whereClause: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            AND: andConditions,
            ...(filterType ? { type: filterType } : {}),
            ...(cityValue ? { locations: { has: cityValue } } : {}),
        };

        const guestCacheKey = isGuest
            ? ['opportunities', 'v3', `type:${filterType || 'all'}`, `city:${cityValue || 'all'}`, `min:${minSal ?? 'na'}`, `max:${maxSal ?? 'na'}`, `sort:${sortKey || 'default'}`, `page:${p}`, `limit:${Math.min(l, GUEST_FEED_LIMIT)}`].join('|')
            : null;

        if (isGuest && guestCacheKey && redis_client) {
            const cached = await redis_client.get(guestCacheKey).catch(() => null);
            if (cached) {
                res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
                res.setHeader('Vary', 'Cookie, Authorization');
                res.setHeader('X-Feed-Cache', 'HIT');
                return res.json(JSON.parse(cached));
            }
        }

        const totalAvailable = isGuest ? undefined : await prisma.opportunity.count({ where: whereClause });
        const effectiveLimit = isGuest ? Math.min(l, GUEST_FEED_LIMIT) : l;
        const effectiveSkip = isGuest ? 0 : (p - 1) * effectiveLimit;

        const dbFiltered = await prisma.opportunity.findMany({
            where: whereClause,
            select: isGuest ? buildGuestOpportunitySelect() : buildPublicOpportunitySelect(userId),
            orderBy: { postedAt: 'desc' },
            take: effectiveLimit,
            skip: effectiveSkip
        });

        const mappedResults = dbFiltered.map((opp: any) => {
            const { savedBy, ...rest } = opp;
            return { ...rest, isSaved: Boolean(savedBy && savedBy.length > 0) };
        });

        if (isGuest) res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        else res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Vary', 'Cookie, Authorization');

        let finalResults: any[] = mappedResults;
        if (!isAdmin && profile) {
            finalResults = filterOpportunitiesForUser(mappedResults as any, profile as any);
        }

        const includeRelevanceDebug = isAdmin && relevanceDebug === 'true' && Boolean(profile);
        let sorted = finalResults;
        let debug: any[] | undefined;

        if (profile) {
            const ranked = rankOpportunitiesForUser(finalResults as any, profile as any);
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

        if (sortKey === 'freshness_v2') {
            const daySeed = Number(`${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${userId || '0'}`.slice(-6));
            sorted = [...sorted].sort((a: any, b: any) => getFreshnessScore(b, daySeed) - getFreshnessScore(a, daySeed));
        }

        const responsePayload = {
            opportunities: sorted,
            count: sorted.length,
            total: isGuest ? sorted.length : totalAvailable,
            page: isGuest ? 1 : p,
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
