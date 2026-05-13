import prisma from '../../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAdmin } from '../../middleware/auth';

const router: Router = express.Router();

interface FeedbackGroup {
    opportunity: {
        id: string;
        title: string;
        company: string;
        type: string;
    } | null;
    feedbackCount: number;
    negativeCount: number;
    feedback: Array<{
        id: string;
        reason: string;
        createdAt: Date;
        user: {
            fullName: string | null;
            email: string;
        };
    }>;
}


// GET /api/admin/feedback/alerts - Unread-style counters since a timestamp
router.get('/alerts', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sinceRaw = typeof req.query.since === 'string' ? req.query.since : undefined;
        const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
        const where = sinceDate && !Number.isNaN(sinceDate.getTime())
            ? { createdAt: { gt: sinceDate } }
            : {};

        const [listingCount, appCount] = await Promise.all([
            prisma.listingFeedback.count({ where }),
            prisma.appFeedback.count({ where })
        ]);

        res.json({
            listingCount,
            appCount,
            total: listingCount + appCount
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/feedback - Get all feedback sorted by negative count
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get feedback with opportunity details
        const feedback = await prisma.listingFeedback.findMany({
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true
                    }
                },
                opportunity: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        type: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by opportunity and count
        const feedbackByOpportunity = feedback.reduce((acc: Record<string, FeedbackGroup>, item) => {
            const oppId = item.opportunityId as string;
            if (!acc[oppId]) {
                acc[oppId] = {
                    opportunity: item.opportunity,
                    feedbackCount: 0,
                    negativeCount: 0,
                    feedback: []
                };
            }
            acc[oppId].feedbackCount++;
            if (['EXPIRED', 'LINK_BROKEN', 'DUPLICATE'].includes(item.reason as string)) {
                acc[oppId].negativeCount++;
            }
            acc[oppId].feedback.push({
                id: item.id as string,
                reason: item.reason as string,
                createdAt: item.createdAt as Date,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                user: item.user as any
            });
            return acc;
        }, {} as Record<string, FeedbackGroup>);

        // Sort by negative count
        const sorted = (Object.values(feedbackByOpportunity) as FeedbackGroup[]).sort((a, b) =>
            b.negativeCount - a.negativeCount
        );

        res.json({ feedbackSummary: sorted });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/opportunities/:id/feedback
router.get('/opportunities/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        const feedback = await prisma.listingFeedback.findMany({
            where: { opportunityId: id },
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ feedback });
    } catch (error) {
        next(error);
    }
});

export default router;
