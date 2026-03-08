import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router: Router = express.Router();


/**
 * POST /api/saved/:id
 * Toggle save/bookmark status for an opportunity.
 * Supports both UUID and Slug.
 */
router.post('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const userId = req.userId!;

        // 1. Find opportunity by ID or Slug
        const opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { id: id },
                    { slug: id }
                ]
            },
            select: { id: true }
        });

        if (!opportunity) {
            return next(new AppError('Opportunity not found', 404));
        }

        const opportunityId = opportunity.id;

        // 2. Check if already saved
        const existing = await prisma.savedOpportunity.findUnique({
            where: {
                userId_opportunityId: {
                    userId,
                    opportunityId
                }
            }
        });

        if (existing) {
            // 3. Unsave (Delete)
            await prisma.savedOpportunity.delete({
                where: {
                    userId_opportunityId: {
                        userId,
                        opportunityId
                    }
                }
            });
            res.json({ saved: false, message: 'Removed from bookmarks' });
        } else {
            // 4. Save (Create)
            await prisma.savedOpportunity.create({
                data: {
                    userId,
                    opportunityId
                }
            });
            res.json({ saved: true, message: 'Saved to bookmarks' });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/saved
 * Retrieve all saved opportunities for the authenticated user.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const saved = await prisma.savedOpportunity.findMany({
            where: { userId },
            include: {
                opportunity: {
                    include: {
                        walkInDetails: true,
                        user: {
                            select: { fullName: true }
                        },
                        actions: {
                            where: { userId }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to return just the opportunity objects, with a 'saved' flag for consistency
        const opportunities = saved.map((s: any) => ({
            ...s.opportunity,
            isSaved: true
        }));

        res.json({ opportunities });
    } catch (error) {
        next(error);
    }
});

export default router;
