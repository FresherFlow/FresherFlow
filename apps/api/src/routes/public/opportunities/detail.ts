import { Router, Request, Response, NextFunction } from 'express';
import { env } from '@fresherflow/utils';
import { Opportunity, Profile } from '@fresherflow/types';
import { redis } from '@fresherflow/database';
import prisma from '../../../infrastructure/database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { checkEligibility, calculateOpportunityMatch } from '@fresherflow/utils';
import { liveOpportunityWhere } from '../../../utils/liveWhere';
import { buildGuestDetailCacheKey } from '../../../infrastructure/services/opportunity/publicOpportunityCache.service';
import {
    isLikelyBotTraffic, publicDetailLimiter, publicDetailBotLimiter,
    tryResolveUserIdFromCookie, buildPublicOpportunitySelect, isSupportedDetailId,
    GUEST_DETAIL_CACHE_TTL_SECONDS, parseSiteMode, GUEST_DETAIL_CACHE_CONTROL
} from './_helpers';

const router: Router = Router();

function adaptiveDetailLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) return publicDetailBotLimiter(req, res, next);
    return publicDetailLimiter(req, res, next);
}

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
        if (!isSupportedDetailId(id)) throw new AppError('Opportunity id is invalid', 400);
        const effectiveSiteMode = parseSiteMode(req.query.siteMode as string | undefined);

        const userId = tryResolveUserIdFromCookie(req);
        const isGuest = !userId;
        const redis_client = env.NODE_ENV === 'development' ? null : redis;
        // Built by the same helper the cache invalidation purges with, so the
        // key a guest request writes is a key the purge can actually match.
        const guestDetailCacheKey = isGuest ? buildGuestDetailCacheKey(effectiveSiteMode, id) : null;

        if (isGuest && guestDetailCacheKey && redis_client) {
            const cached = await redis_client.get(guestDetailCacheKey).catch(() => null);
            if (cached) {
                let parsed: unknown = null;
                try {
                    parsed = JSON.parse(cached);
                } catch {
                    // A corrupt entry must not turn every guest request into a
                    // 500 until the TTL expires. Treat it as a miss.
                    parsed = null;
                }
                if (parsed && typeof parsed === 'object' && (parsed as { is404?: unknown }).is404) {
                    // A cached "not found" is a real 404 and is served as one,
                    // with exactly the same envelope the fresh miss below
                    // produces. Answering 200 with an error body would let a
                    // client render an empty page instead of a not-found page.
                    res.setHeader('X-Detail-Cache', 'HIT');
                    throw new AppError('Opportunity not found', 404);
                }
                if (parsed) {
                    res.setHeader('Cache-Control', GUEST_DETAIL_CACHE_CONTROL);
                    res.setHeader('X-Detail-Cache', 'HIT');
                    return res.json(parsed);
                }
            }
        }

        const extractSlugSuffix = (value: string) => {
            const parts = value.split('-').filter(Boolean);
            const last = parts[parts.length - 1] || '';
            return /^[a-f0-9]{6,12}$/i.test(last) ? last.toLowerCase() : '';
        };

        // ONE liveness rule for every public read (see utils/liveWhere.ts).
        // The lookup used to filter on `deletedAt` only, so a DRAFT, ARCHIVED
        // or already-expired listing was publicly servable by slug or id even
        // though the published feed and the CDN snapshot contain none of them.
        const now = new Date();

        let opportunity = await prisma.opportunity.findFirst({
            where: {
                AND: [
                    { OR: [{ slug: id }, { id: id }] },
                    liveOpportunityWhere(now),
                ],
            },
            select: buildPublicOpportunitySelect(userId || undefined)
        });

        if (!opportunity) {
            const suffix = extractSlugSuffix(id);
            if (suffix) {
                // Slug suffix is the HEAD of the UUID (slugify.ts), so rescue
                // drifted slugs with a head match, not a tail match.
                opportunity = await prisma.opportunity.findFirst({
                    where: {
                        AND: [
                            { id: { startsWith: suffix } },
                            liveOpportunityWhere(now),
                        ],
                    },
                    select: buildPublicOpportunitySelect(userId || undefined)
                });
            }
        }

        if (!opportunity) {
            // Cache 404 in Redis to prevent scraper bots from hammering the database
            if (isGuest && guestDetailCacheKey && redis_client) {
                await redis_client.setex(guestDetailCacheKey, GUEST_DETAIL_CACHE_TTL_SECONDS, JSON.stringify({ error: 'Opportunity not found', is404: true })).catch(() => null);
            }
            throw new AppError('Opportunity not found', 404);
        }

        const isGovernmentOpportunity = Boolean(opportunity.governmentJobDetails);
        if ((effectiveSiteMode === 'govt' && !isGovernmentOpportunity) || (effectiveSiteMode === 'private' && isGovernmentOpportunity)) {
            throw new AppError('Opportunity not found', 404);
        }

        if (userId) res.setHeader('Cache-Control', 'private, no-store');
        else {
            res.setHeader('Cache-Control', GUEST_DETAIL_CACHE_CONTROL);
            res.setHeader('X-Detail-Cache', 'MISS');
        }
        if (userId) res.setHeader('Vary', 'Cookie, Authorization');

        const [appliedCount, selectedCount] = await Promise.all([
            prisma.userAction.count({ where: { opportunityId: opportunity.id, actionType: 'APPLIED' } }),
            prisma.userAction.count({ where: { opportunityId: opportunity.id, actionType: 'SELECTED' } })
        ]);

        const { savedBy, ...opportunitySafe } = opportunity as typeof opportunity & { savedBy?: Array<{ id: string }> };

        // Map rawIngestions so that createdBy is also returned as creator to resolve name drift
        const rawIngestionsMapped = (opportunitySafe.rawIngestions as Array<{ createdBy?: { username: string } | null } & Record<string, unknown>>)?.map((ri) => ({
            ...ri,
            creator: ri.createdBy,
        })) || [];

        const creator = rawIngestionsMapped[0]?.creator;
        const isReferral = Boolean(creator) && !opportunitySafe.sourceLink;
        const referredByUsername = isReferral ? (creator?.username || undefined) : undefined;

        const opportunityWithSaved = {
            ...opportunitySafe,
            rawIngestions: rawIngestionsMapped,
            isReferral,
            referredByUsername,
            isSaved: Boolean(savedBy && savedBy.length > 0),
            appliedCount,
            selectedCount
        };

        let isEligible = true;
        let eligibilityReason: string | undefined;
        let matchScore = 0;
        let matchReason: string = 'Complete profile to see fit';

        if (userId) {
            const profile = await prisma.profile.findUnique({ where: { userId } });
            if (profile) {
                const result = checkEligibility(opportunity as unknown as Opportunity, profile as unknown as Profile, userId);
                isEligible = result.eligible;
                eligibilityReason = result.reason;

                const matchResult = calculateOpportunityMatch(profile as unknown as Profile, opportunity as unknown as Opportunity);
                matchScore = matchResult.score;
                matchReason = matchResult.reason;
            }
        }

        const responsePayload = {
            opportunity: opportunityWithSaved,
            isEligible,
            eligibilityReason,
            matchScore,
            matchReason
        };

        if (isGuest && guestDetailCacheKey && redis_client) {
            await redis_client.setex(guestDetailCacheKey, GUEST_DETAIL_CACHE_TTL_SECONDS, JSON.stringify(responsePayload)).catch(() => null);
        }

        return res.json(responsePayload);
    } catch (e) {
        next(e);
    }
});

export default router;
