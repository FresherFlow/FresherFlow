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
            throw new AppError(`Parsing failed: ${err.message}`, 500);
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
