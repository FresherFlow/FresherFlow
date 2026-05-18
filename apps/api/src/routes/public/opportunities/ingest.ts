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

        // Check for existing opportunity
        const existing = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { sourceLink: normalizedUrl },
                    { applyLink: normalizedUrl }
                ],
                deletedAt: null
            },
            select: { id: true }
        });

        // Check for existing pending/review opportunity
        const existingRaw = await prisma.rawOpportunity.findFirst({
            where: {
                sourceLink: normalizedUrl,
                status: { in: ['FETCHED', 'DRAFT_CREATED'] }
            },
            select: { id: true }
        });

        if (existingRaw) {
            return res.status(409).json({
                message: 'This link is already under review!'
            });
        }

        const result = await UrlParser.parseUrl(normalizedUrl).catch((err: Error) => {
            throw new AppError(`Parsing failed: ${err.message}`, 500);
        });

        if (!result.parsed.title) {
            return res.status(422).json({
                message: 'Could not extract opportunity details from this link.',
                meta: result.meta
            });
        }

        res.json({
            success: true,
            data: {
                ...result.parsed,
                isDuplicate: !!existing,
                existingId: existing?.id || null
            },
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
});

export default router;
