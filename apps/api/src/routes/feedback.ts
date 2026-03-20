import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { feedbackSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import TelegramService from '../infrastructure/services/telegram.service';

const router: Router = express.Router();


// POST /api/opportunities/:id/feedback
router.post('/:id/feedback', requireAuth, validate(feedbackSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: opportunityId } = req.params as { id: string };
        const { reason } = req.body;

        // Verify opportunity exists
        const opportunity = await prisma.opportunity.findUnique({
            where: { id: opportunityId }
        });

        if (!opportunity) {
            return next(new AppError('Opportunity not found', 404));
        }

        // Create feedback (unique constraint prevents spam)
        const feedback = await prisma.listingFeedback.create({
            data: {
                userId: req.userId!,
                opportunityId,
                reason
            }
        });

        const reporter = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: { email: true }
        });

        TelegramService.notifyListingFeedback({
            opportunityId,
            title: opportunity.title,
            company: opportunity.company,
            reason,
            userEmail: reporter?.email
        }).catch(() => { });

        res.status(201).json({
            feedback,
            message: 'Feedback submitted successfully'
        });
    } catch (error: unknown) {
        // Handle unique constraint violation
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return next(new AppError('You have already submitted feedback for this opportunity', 400));
        }
        next(error);
    }
});

export default router;
