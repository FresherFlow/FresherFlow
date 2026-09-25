import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../middleware/auth';
import { updateOpportunityEngagement } from '../application/opportunity/engagement';

const router: Router = express.Router();


/**
 * POST /api/saved/:id
 * Toggle save/bookmark status for an opportunity.
 * Supports both UUID and Slug.
 */
router.post('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const userId = req.userId as string;

        // 1. Find opportunity by ID or Slug
        // Soft-deleted opportunities must not be bookmarkable: saving one would
        // let a user pin a listing the platform has already removed.
        const opportunity = await prisma.opportunity.findFirst({
            where: {
                deletedAt: null,
                OR: [
                    { id: id },
                    { slug: id }
                ]
            },
            select: { id: true }
        });

        if (!opportunity) {
            return res.json({ saved: false });
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

            await updateOpportunityEngagement(opportunityId, 'unsave');

            res.json({ saved: false, message: 'Removed from bookmarks' });
        } else {
            // 4. Save (Create)
            await prisma.savedOpportunity.create({
                data: {
                    userId,
                    opportunityId
                }
            });

            await updateOpportunityEngagement(opportunityId, 'save');

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
                    // A bookmark created before a listing was soft-deleted must
                    // not keep its full record readable through this endpoint.
                    where: { deletedAt: null },
                    include: {
                        driveDetails: true,
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

        // Prisma returns saved rows whose opportunity no longer matches the
        // nested filter with `opportunity: null`; drop them so the response
        // shape stays a flat list of opportunities.
        const opportunities = saved
            .filter((s) => s.opportunity !== null)
            .map((s) => ({
                ...(s.opportunity as NonNullable<typeof s.opportunity>),
                isSaved: true
            }));

        res.json({ opportunities });
    } catch (error) {
        next(error);
    }
});

export default router;
