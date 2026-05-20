import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
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
        let opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { id: id },
                    { slug: id }
                ]
            },
            select: { id: true }
        });

        if (!opportunity) {
            const details = req.body;
            if (details && (details.title || details.company)) {
                // Find first admin to assign as postedByUserId
                let postedByUserId: string = userId;
                const firstAdmin = await prisma.user.findFirst({
                    where: { role: 'ADMIN' }
                });
                if (firstAdmin) {
                    postedByUserId = firstAdmin.id as string;
                }

                // Parse type safely from details
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const oppType = (['JOB', 'INTERNSHIP', 'WALKIN'].includes(details.type) ? details.type : 'JOB') as any;

                opportunity = await prisma.opportunity.create({
                    data: {
                        id: typeof details.id === 'string' ? details.id : id,
                        slug: typeof details.slug === 'string' ? details.slug : (typeof details.id === 'string' ? details.id : id),
                        type: oppType,
                        title: typeof details.title === 'string' ? details.title : 'Cached Opportunity',
                        company: typeof details.company === 'string' ? details.company : 'Unknown Company',
                        companyLogoUrl: typeof details.companyLogoUrl === 'string' ? details.companyLogoUrl : null,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        locations: Array.isArray(details.locations) ? details.locations.map((l: any) => String(l)) : [],
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        tags: Array.isArray(details.tags) ? details.tags.map((t: any) => String(t)) : [],
                        status: 'PUBLISHED',
                        postedByUserId: postedByUserId
                    },
                    select: { id: true }
                });
            } else {
                return next(new AppError('Opportunity not found', 404));
            }
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
        const opportunities = saved.map((s) => ({
            ...s.opportunity,
            isSaved: true
        }));

        res.json({ opportunities });
    } catch (error) {
        next(error);
    }
});

export default router;
