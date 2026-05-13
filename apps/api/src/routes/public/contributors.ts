import { Router } from 'express';
import { prisma } from '@fresherflow/database';
import { OpportunityStatus } from '@fresherflow/types';
import { AppError } from '../../middleware/errorHandler';
import { buildGuestOpportunitySelect } from './opportunities/_helpers';

const router = Router();

/**
 * @route   GET /api/contributors/:userId/opportunities
 * @desc    Get a contributor's public profile and published opportunities
 */
router.get('/:userId/opportunities', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            fullName: true,
            trustLevel: true,
            createdAt: true,
        }
    });

    if (!user) {
        throw new AppError('Contributor not found.', 404);
    }

    // Fetch stats
    const [totalContributed, totalPublished] = await Promise.all([
        prisma.rawOpportunity.count({ where: { createdByUserId: userId } }),
        prisma.opportunity.count({
            where: {
                rawIngestions: { some: { createdByUserId: userId } },
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null
            }
        }),
    ]);

    // Fetch published opportunities
    const opportunities = await prisma.opportunity.findMany({
        where: {
            rawIngestions: { some: { createdByUserId: userId } },
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null
        },
        select: buildGuestOpportunitySelect(),
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
    });

    const total = totalPublished;
    const hasMore = skip + opportunities.length < total;

    res.json({
        user: {
            ...user,
            stats: {
                totalContributed,
                totalPublished,
                approvalRate: totalContributed > 0 ? Math.round((totalPublished / totalContributed) * 100) : 0
            }
        },
        opportunities,
        page,
        total,
        hasMore
    });
});

export default router;
