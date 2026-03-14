import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middleware/errorHandler';
import { OpportunityService } from '../../../domain/opportunity';
import {
    isLikelyBotTraffic, publicFeedLimiter, publicFeedBotLimiter,
    normalizeSafeQueryString, parseStrictPositiveInt, parseOpportunityType
} from './_helpers';

const router: Router = Router();

function adaptiveSearchLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) return publicFeedBotLimiter(req, res, next);
    return publicFeedLimiter(req, res, next);
}

router.get('/search', adaptiveSearchLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
