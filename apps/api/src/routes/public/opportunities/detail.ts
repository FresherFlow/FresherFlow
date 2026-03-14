import { Router, Request, Response, NextFunction } from 'express';
import { env } from '@fresherflow/config';
import { Opportunity, Profile } from '@fresherflow/types';
import { redis } from '@fresherflow/redis';
import prisma from '../../../lib/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { checkEligibility } from '../../../domain/eligibility';
import {
    isLikelyBotTraffic, publicDetailLimiter, publicDetailBotLimiter,
    tryResolveUserIdFromCookie, buildPublicOpportunitySelect, isSupportedDetailId,
    GUEST_DETAIL_CACHE_TTL_SECONDS
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

        const userId = tryResolveUserIdFromCookie(req);
        const isGuest = !userId;
        const redis_client = env.NODE_ENV === 'development' ? null : redis;
        const guestDetailCacheKey = isGuest ? `opportunity_detail|v2|id:${id}` : null;

        if (isGuest && guestDetailCacheKey && redis_client) {
            const cached = await redis_client.get(guestDetailCacheKey).catch(() => null);
            if (cached) {
                res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
                res.setHeader('Vary', 'Cookie, Authorization');
                res.setHeader('X-Detail-Cache', 'HIT');
                return res.json(JSON.parse(cached));
            }
        }

        const extractSlugSuffix = (value: string) => {
            const parts = value.split('-').filter(Boolean);
            const last = parts[parts.length - 1] || '';
            return /^[a-f0-9]{6,12}$/i.test(last) ? last.toLowerCase() : '';
        };

        let opportunity = await prisma.opportunity.findFirst({
            where: { OR: [{ slug: id }, { id: id }], deletedAt: null },
            select: buildPublicOpportunitySelect(userId || undefined)
        });

        if (!opportunity) {
            const suffix = extractSlugSuffix(id);
            if (suffix) {
                opportunity = await prisma.opportunity.findFirst({
                    where: { id: { endsWith: suffix }, deletedAt: null },
                    select: buildPublicOpportunitySelect(userId || undefined)
                });
            }
        }

        if (!opportunity) throw new AppError('Opportunity not found', 404);

        if (userId) res.setHeader('Cache-Control', 'private, no-store');
        else {
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
                const result = checkEligibility(opportunity as unknown as Opportunity, profile as unknown as Profile, userId);
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
            await redis_client.setex(guestDetailCacheKey, GUEST_DETAIL_CACHE_TTL_SECONDS, JSON.stringify(responsePayload)).catch(() => null);
        }

        return res.json(responsePayload);
    } catch (e) {
        next(e);
    }
});

export default router;
