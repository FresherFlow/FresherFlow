import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { AppFeedbackType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { appFeedbackSchema } from '../utils/validation';
import TelegramService from '../services/telegram.service';

const router: Router = express.Router();


// POST /api/feedback - Submit product feedback
router.post('/', requireAuth, validate(appFeedbackSchema), async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
