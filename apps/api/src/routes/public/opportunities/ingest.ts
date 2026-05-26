import { Router, Request, Response, NextFunction } from 'express';
import { UrlParser } from '@fresherflow/parser';
import { prisma } from '@fresherflow/database';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { AppError } from '../../../middleware/errorHandler';

const router = Router();

/**
 * POST /api/opportunities/ingest
 * Public endpoint to "Magic Share" an opportunity by URL.
 */
router.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'A valid URL string is required' });
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ message: 'Invalid URL format' });
        }

        const normalizedUrl = normalizeOpportunityUrl(url);

        // We no longer perform server-side duplicate checks during ingest, 
        // as the mobile app relies on its local CDN cache for duplicate prevention.

        const result = await UrlParser.parseUrl(normalizedUrl).catch((err: Error) => {
            console.error(`[Ingest] Parsing failed for ${normalizedUrl}:`, err);
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
