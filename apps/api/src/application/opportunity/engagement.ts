import prisma from '../../infrastructure/database/prisma';
import { calculateTrendingScore } from '@fresherflow/domain';

/**
 * Updates engagement counters and recalculates the trending score for an opportunity.
 */
export async function updateOpportunityEngagement(opportunityId: string, type: 'share' | 'save' | 'unsave' | 'click') {
    const opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: {
            sharesCount: true,
            savesCount: true,
            clicksCount: true,
            postedAt: true,
            linkHealth: true,
        }
    });

    if (!opp) return;

    let { sharesCount, savesCount, clicksCount } = opp;

    if (type === 'share') sharesCount++;
    else if (type === 'save') savesCount++;
    else if (type === 'unsave') savesCount = Math.max(0, savesCount - 1);
    else if (type === 'click') clicksCount++;

    const newScore = calculateTrendingScore({
        shares: sharesCount,
        saves: savesCount,
        clicks: clicksCount,
        postedAt: opp.postedAt,
        isVerified: opp.linkHealth === 'HEALTHY'
    });

    await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
            sharesCount,
            savesCount,
            clicksCount,
            trendingScore: newScore
        }
    });
}
