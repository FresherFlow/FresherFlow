import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { AppFeedbackType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { appFeedbackSchema } from '../utils/validation';
import TelegramService from '../infrastructure/services/alerts/telegram.service';

const router: Router = express.Router();

// Feedback creates a row plus a Telegram ping; cap it strictly like the
// community report/submit limiters (10/hour). Limiter sits before auth.
const appFeedbackLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many feedback submissions. Please try again later.',
    keyPrefix: 'app_feedback',
});


// POST /api/feedback - Submit product feedback
router.post('/', appFeedbackLimiter, requireAuth, validate(appFeedbackSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, rating, message, pageUrl } = req.body as {
            type: AppFeedbackType;
            rating?: number;
            message: string;
            pageUrl?: string;
        };

        const feedback = await prisma.appFeedback.create({
            data: {
                userId: req.userId!,
                type,
                rating,
                message,
                pageUrl
            }
        });

        const reporter = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: { email: true }
        });

        TelegramService.notifyAppFeedback({
            type,
            message,
            rating,
            pageUrl,
            userEmail: reporter?.email
        }).catch(() => { });

        res.json({
            feedback,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/feedback/mine - List the caller's own feedback, newest first (max 50).
// NOTE: AppFeedback has no status column, so every row reports PENDING here;
// the client renders REVIEWED/RESOLVED only if a status source exists later.
router.get('/mine', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rows = await prisma.appFeedback.findMany({
            where: { userId: req.userId! },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                type: true,
                message: true,
                rating: true,
                createdAt: true
            }
        });

        res.json({
            feedback: rows.map((row) => ({
                id: row.id,
                type: row.type,
                message: row.message,
                rating: row.rating,
                status: 'PENDING' as const,
                createdAt: row.createdAt
            }))
        });
    } catch (error) {
        next(error);
    }
});

export default router;
