import prisma from '../../infrastructure/database/prisma';
import { determineTrustLevel, calculateNewTrustScore } from '@fresherflow/domain';
import { OpportunityStatus } from '@fresherflow/types';

/**
 * Rejects an opportunity and penalizes the contributor.
 */
export async function rejectOpportunity(opportunityId: string, adminId: string, reason: string, isSpam = false) {
  return await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, postedByUserId: true, status: true }
    });

    if (!opportunity) throw new Error('Opportunity not found');

    // 1. Update Opportunity Status
    const updated = await tx.opportunity.update({
      where: { id: opportunityId },
      data: {
        status: OpportunityStatus.ARCHIVED,
        deletedAt: new Date(),
        deletionReason: reason || (isSpam ? 'Flagged as spam' : 'Rejected by moderator'),
      }
    });

    // 2. Adjust User Reputation
    const action = isSpam ? 'INVALID_SHARE' : 'DUPLICATE_SHARE';
    const contributor = await tx.user.findUnique({
      where: { id: opportunity.postedByUserId },
      select: { id: true, trustScore: true }
    });

    if (contributor) {
      const nextScore = calculateNewTrustScore(contributor.trustScore || 0, action);
      const nextLevel = determineTrustLevel(nextScore);

      await tx.user.update({
        where: { id: contributor.id },
        data: {
          trustScore: nextScore,
          trustLevel: nextLevel
        }
      });
    }

    // 3. Create Audit Log
    await tx.adminAudit.create({
      data: {
        userId: adminId,
        action: isSpam ? 'SPAM' : 'REJECT',
        targetId: opportunityId,
        reason: reason || (isSpam ? 'SPAM' : 'REJECTED')
      }
    });

    return updated;
  });
}
