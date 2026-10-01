import { Router, Request, Response, NextFunction } from 'express';
import { UrlParser } from '@fresherflow/parser';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { logger } from '@fresherflow/utils';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { sendError, ErrorCode } from '../../../middleware/errorHandler';

const router = Router();

// Unauthenticated and it writes ingestion rows from an attacker-supplied URL,
// so the cap is tighter than the read limiters.
const ingestLinkLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many link ingests. Please slow down.',
    keyPrefix: 'opportunity_ingest',
});

/**
 * POST /api/opportunities/ingest
 * Public endpoint to "Magic Share" an opportunity by URL.
 */
router.post('/ingest', ingestLinkLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'A valid URL string is required', req.requestId);
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Invalid URL format', req.requestId);
        }

        const normalizedUrl = normalizeOpportunityUrl(url);

        // We no longer perform server-side duplicate checks during ingest, 
        // as the mobile app relies on its local CDN cache for duplicate prevention.

        const result = await UrlParser.parseUrl(normalizedUrl).catch((err: Error) => {
            logger.error(`[Ingest] Parsing failed for ${normalizedUrl}:`, err);
            // Graceful fallback: return empty parsed data with the raw URL so the share is NOT blocked!
            return {
                parsed: {
                    title: 'Shared Opportunity',
                    company: new URL(normalizedUrl).hostname,
                },
                meta: {
                    sourceType: 'GENERIC' as const,
                    confidence: 0,
                    missing: ['title', 'description'],
                    warnings: [`parsing_failed: ${err.message}`],
                    finalUrl: normalizedUrl
                }
            };
        });

        res.json({
            success: true,
            data: {
                ...result.parsed,
                title: result.parsed.title || 'New Opportunity',
                isDuplicate: false,
                existingId: null
            },
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
});

export default router;
