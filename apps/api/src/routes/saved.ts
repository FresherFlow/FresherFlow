import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../middleware/auth';
import { updateOpportunityEngagement } from '../application/opportunity/engagement';

const router: Router = express.Router();

/** Prisma's unique-constraint failure, by code rather than by message text. */
function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: unknown }).code === 'P2002'
    );
}


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
            // Unknown id or slug: 404, but keep `saved: false` in the body so
            // existing clients that only read the flag keep working.
            return res.status(404).json({
                saved: false,
                error: { message: 'Opportunity not found' },
            });
        }

        const opportunityId = opportunity.id;

        // 2. Toggle. deleteMany / a P2002-tolerant create replace the previous
        // read-then-write: two concurrent taps on the bookmark button both read
        // "not saved", both tried to insert, and the loser surfaced a 500 from
        // the unique constraint. The counter only moves for the branch that
        // actually changed the row, so it cannot double-count.
        const { count: deleted } = await prisma.savedOpportunity.deleteMany({
            where: { userId, opportunityId }
        });

        if (deleted > 0) {
            await updateOpportunityEngagement(opportunityId, 'unsave');
            return res.json({ saved: false, message: 'Removed from bookmarks' });
        }

        try {
            await prisma.savedOpportunity.create({
                data: { userId, opportunityId }
            });
        } catch (createError) {
            // Lost a concurrent insert; the row now exists, so the desired end
            // state (saved) is achieved. Treat it as a successful save.
            if (isUniqueViolation(createError)) {
                return res.json({ saved: true, message: 'Saved to bookmarks' });
            }
            throw createError;
        }

        await updateOpportunityEngagement(opportunityId, 'save');
        return res.json({ saved: true, message: 'Saved to bookmarks' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/saved
 * Retrieve saved opportunities for the authenticated user (paginated).
 * Backward compatible: `opportunities` keeps its shape; pagination fields
 * (`page`, `limit`, `total`, `totalPages`, `hasMore`) are additive.
 * No web/mobile caller passes page params today (web `savedApi.list()` takes
 * no args; mobile has no savedApi usage), so the default first page preserves
 * existing behavior while bounding the query.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const rawPage = parseInt(String(req.query.page ?? '1'), 10);
        const rawLimit = parseInt(String(req.query.limit ?? '20'), 10);
        const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), 1000) : 1;
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
        const skip = (page - 1) * limit;
        const where = {
            userId,
            opportunity: { deletedAt: null }
        };
        const [total, saved] = await Promise.all([
            prisma.savedOpportunity.count({ where }),
            prisma.savedOpportunity.findMany({
                // A bookmark created before a listing was soft-deleted must not keep
                // its full record readable through this endpoint. This filter has to
                // live in the top-level `where`: Prisma ignores `where` nested inside
                // `include`, which would silently leak soft-deleted opportunities.
                where,
                include: {
                    opportunity: {
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
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
        ]);

        const opportunities = saved.map((s) => ({
            ...(s.opportunity as NonNullable<typeof s.opportunity>),
            isSaved: true
        }));

        const totalPages = Math.max(1, Math.ceil(total / limit));
        res.json({ opportunities, page, limit, total, totalPages, hasMore: page < totalPages });
    } catch (error) {
        next(error);
    }
});

export default router;
