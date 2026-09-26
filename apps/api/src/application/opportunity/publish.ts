import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import { handleOpportunityPublished } from '../../infrastructure/services/publish.service';
import { calculateNewTrustScore, determineTrustLevel } from '@fresherflow/utils';

/**
 * Use Case: Publish Opportunity (DRAFT → PUBLISHED).
 *
 * Publication rules (Phase 5):
 * - only DRAFT rows can be published (idempotent retries on PUBLISHED fail
 *   loudly rather than re-firing side effects)
 * - soft-deleted rows can never be published; restore first
 * - must carry title + company + at least one contact surface (applyLink,
 *   sourceLink, or drive details for venue-based drives)
 * - expired rows are revived: expiry columns clear on publish
 * - linkHealth BROKEN does not block publish but is left for the
 *   verification bot; trust starts at 50/UNVERIFIED for new rows
 */
export async function publishOpportunity(id: string, _adminId: string) {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id },
        include: { driveDetails: true },
    });

    if (!opportunity) throw new Error('Opportunity not found');
    if (opportunity.deletedAt) throw new Error('Cannot publish a deleted opportunity — restore it first');

    // Admins should be able to publish any draft, not just their own
    // especially for user-shared links.
    if (opportunity.status !== OpportunityStatus.DRAFT) {
        throw new Error('Can only publish draft opportunities');
    }

    const hasLink = Boolean(opportunity.applyLink || opportunity.sourceLink);
    const hasVenue = Boolean(opportunity.driveDetails);
    if (!opportunity.title?.trim() || !opportunity.company?.trim()) {
        throw new Error('Cannot publish without title and company');
    }
    if (!hasLink && !hasVenue) {
        throw new Error('Cannot publish without an applyLink, sourceLink, or drive venue');
    }

    const updated = await prisma.opportunity.update({
        where: { id },
        data: {
            status: OpportunityStatus.PUBLISHED,
            postedAt: new Date(), // Refresh date for feed
            publishedAt: new Date(),
            expiredAt: null,
            expiresAt: null,
            lastVerified: new Date(),
        },
        include: {
            driveDetails: true,
            governmentJobDetails: true,
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
