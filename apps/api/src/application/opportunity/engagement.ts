import prisma from '../../infrastructure/database/prisma';
import { calculateTrendingScore } from '@fresherflow/utils';

/**
 * Opportunity engagement counters (Phase 5).
 *
 * Denormalized shares/saves/clicks + trendingScore live on the Opportunity
 * row for feed ranking. SavedSearch (personal matching) and Room (community
 * curation) both READ these counters but never write them — writes go
 * through this module only, so the three concerns cannot drift.
 */
export async function updateOpportunityEngagement(opportunityId: string, type: 'share' | 'save' | 'unsave' | 'click') {
    // Increment atomically in the database. A read-then-write here loses updates
    // whenever two requests interleave, and trendingScore (which the public feed
    // ranks on) is derived from these same counters.
    const delta =
        type === 'share' ? { sharesCount: 1 }
            : type === 'save' ? { savesCount: 1 }
                : type === 'unsave' ? { savesCount: -1 }
                    : { clicksCount: 1 };

    const updated = await prisma.opportunity.updateMany({
        // Soft-deleted and unpublished rows must not accumulate engagement.
        where: { id: opportunityId, deletedAt: null },
        data: delta,
    });

    if (updated.count === 0) return;

    // Recompute the score from the authoritative post-increment values rather than
    // a value read earlier in the request, which may already be stale.
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

    await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
            trendingScore: calculateTrendingScore({
                shares: Math.max(0, opp.sharesCount),
                saves: Math.max(0, opp.savesCount),
                clicks: Math.max(0, opp.clicksCount),
                postedAt: opp.postedAt,
                isVerified: opp.linkHealth === 'HEALTHY'
            })
        }
    });
}
