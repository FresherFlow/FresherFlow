import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import { handleOpportunityPublished } from '../../infrastructure/services/publish.service';
import { calculateNewTrustScore, determineTrustLevel } from '@fresherflow/domain';

/**
 * Use Case: Publish Opportunity (DRAFT → ACTIVE)
 */
export async function publishOpportunity(id: string, _adminId: string) {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!opportunity) throw new Error('Opportunity not found');

    // Admins should be able to publish any draft, not just their own
    // especially for user-shared links.
    if (opportunity.status !== OpportunityStatus.DRAFT) {
        throw new Error('Can only publish draft opportunities');
    }

    const updated = await prisma.opportunity.update({
        where: { id },
        data: {
            status: OpportunityStatus.PUBLISHED,
            postedAt: new Date(), // Refresh date for feed
            publishedAt: new Date(),
            lastVerified: new Date(),
        },
    });


    // Reward the contributor if it was a user share
    if (updated.postedByUserId && updated.postedByUserId !== 'SYSTEM_DEFAULT' && updated.postedByUserId !== 'SYSTEM_ADMIN') {
        const user = await prisma.user.findUnique({ where: { id: updated.postedByUserId as string } });
        if (user) {
            const newScore = calculateNewTrustScore(user.trustScore as number, 'VALID_SHARE');
            const newLevel = determineTrustLevel(newScore);

            await prisma.user.update({
                where: { id: user.id as string },
                data: {
                    trustScore: newScore,
                    trustLevel: newLevel
                }
            });
        }
    }

    // Dispatch side-effects (Decoupled from routes handlers)
    await handleOpportunityPublished(updated as unknown as Opportunity, { isNew: true });

    return updated;
}
