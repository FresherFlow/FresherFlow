import express, { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rateLimit';
import TelegramService from '../../services/telegram.service';

const router = express.Router();

const submitLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 submissions per IP per hour
    message: 'Too many submissions. Please try again later.',
    keyPrefix: 'rate:joblink:submit',
});

// POST /api/public/submit-job-link
router.post('/submit-job-link', submitLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url, source = 'anonymous' } = req.body;

        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return res.status(400).json({ error: 'Valid URL is required' });
        }

        // Check if there is already a CROWDSOURCED IngestionSource
        let ingestionSource = await prisma.ingestionSource.findFirst({
            where: { name: 'Crowdsourced Links' }
        });

        if (!ingestionSource) {
            ingestionSource = await prisma.ingestionSource.create({
                data: {
                    name: 'Crowdsourced Links',
                    sourceType: 'CUSTOM',
                    endpoint: 'Public Submissions',
                    defaultType: 'JOB',
                }
            });
        }

        // Store the URL in RawOpportunity to be processed by admins/ParserService later
        await prisma.rawOpportunity.create({
            data: {
                sourceId: ingestionSource.id,
                sourceLink: url,
                status: 'FETCHED',
                reasonFlags: ['CROWDSOURCED', `submitted_by:${source}`],
                rawPayload: { url, source, submittedAt: new Date().toISOString() }
            }
        });

        // Notify Admin instantly via Telegram
        void TelegramService.notifyJobSubmission(url, source);

        res.status(201).json({ success: true, message: 'Thank you for your submission!' });
    } catch (e) {
        next(e);
    }
});

export default router;
