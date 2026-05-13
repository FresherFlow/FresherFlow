import { Router } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { z } from 'zod';

const router = Router();

const syncQuerySchema = z.object({
  since: z.string().optional(), // ISO String
});

/**
 * @route   GET /api/opportunities/sync
 * @desc    Lightweight endpoint to fetch only the status of opportunities changed since a timestamp.
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { since } = syncQuerySchema.parse(req.query);

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24h

    const changedOpportunities = await prisma.opportunity.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
        // Only sync if it's a meaningful change for the mobile state
        OR: [
          { status: { not: undefined } }, // This is always true if updatedAt changed, but we can be more specific
          { expiresAt: { gt: sinceDate } },
          { deletedAt: { gt: sinceDate } }
        ]
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        expiredAt: true,
        deletedAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    // Final filter: If the update was just a click (updatedAt changed but nothing else did), skip it
    const meaningfulUpdates = changedOpportunities.filter(opp => {
        // If it was deleted or its expiry changed recently, it's meaningful
        const wasDeleted = opp.deletedAt && opp.deletedAt > sinceDate;
        const wasExpired = opp.expiresAt && opp.expiresAt < new Date() && opp.updatedAt > sinceDate;

        // Return true if it was a deletion, an expiry, or a potential status change
        // This ensures the mobile app stays in sync with real changes
        return !!(wasDeleted || wasExpired || opp.status);
    });

    return res.json({
      timestamp: new Date().toISOString(),
      count: meaningfulUpdates.length,
      updates: meaningfulUpdates,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
