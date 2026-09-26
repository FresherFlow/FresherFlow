import prisma from '../../infrastructure/database/prisma';
import { calculateTrendingScore } from '@fresherflow/utils';

/**
 * Opportunity engagement counters (Phase 5).
 *
 * Denormalized shares/saves/clicks + trendingScore live on the Opportunity
 * row for feed ranking. SavedSearch (personal matching) and Room (community
 * curation) both READ these counters but never write them — writes go
 * through this module only, so the three concerns cannot drift.
 *
 * Counters move with atomic increments/decrements, never with absolute sets
 * or read-modify-write: two concurrent clicks would otherwise lose an update.
 * Soft-deleted rows never accumulate engagement, and counters never go negative.
 */
export async function updateOpportunityEngagement(opportunityId: string, type: 'share' | 'save' | 'unsave' | 'click') {
    const field =
        type === 'share' ? 'sharesCount'
        : type === 'save' || type === 'unsave' ? 'savesCount'
        : type === 'click' ? 'clicksCount'
        : null;

    if (!field) return;

    // Step 1: atomic counter move. updateMany (not update) so a missing or
    // soft-deleted row is a no-op instead of a P2025 throw.
    let moved;
    if (type === 'unsave') {
        // Decrementing is guarded so the counter cannot go negative.
        moved = await prisma.opportunity.updateMany({
            where: { id: opportunityId, deletedAt: null, [field]: { gt: 0 } },
            data: { [field]: { decrement: 1 } },
        });
    } else {
        moved = await prisma.opportunity.updateMany({
            where: { id: opportunityId, deletedAt: null },
            data: { [field]: { increment: 1 } },
        });
    }

    if (moved.count === 0) return;

    // Step 2: read the committed counters back to derive the trending score.
    const opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: {
            sharesCount: true,
            savesCount: true,
            clicksCount: true,
            postedAt: true,
            linkHealth: true,
        },
    });
    if (!opp) return;

    // Step 3: trending score derived from the committed counters. Clamp
    // at 0 as a second line of defence against a negative counter.
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
