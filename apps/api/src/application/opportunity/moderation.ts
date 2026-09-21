import prisma from '../../infrastructure/database/prisma';
import { determineTrustLevel, calculateNewTrustScore } from '@fresherflow/utils';
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

    // 1b. Keep the contributor's submission history truthful: the linked
    // JobSubmission moves to REJECTED with the moderator's reason.
    await tx.jobSubmission.updateMany({
      where: { opportunityId, status: { notIn: ['REJECTED', 'MERGED'] } },
      data: { status: 'REJECTED' },
    });
    if (opportunity.postedByUserId) {
      await tx.jobSubmission.updateMany({
        where: {
          opportunityId,
          submittedById: opportunity.postedByUserId,
          status: 'REJECTED',
        },
        data: {
          extractedData: {
            rejectionReason: reason || (isSpam ? 'Flagged as spam' : 'Rejected by moderator'),
          },
        },
      });
    }

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

    // 3. Create Audit Log (only when a real UUID adminId is available; withAdminAudit middleware handles it otherwise)
    const isRealAdmin = adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId);
    if (isRealAdmin) {
      await tx.adminAudit.create({
        data: {
          userId: adminId,
          action: isSpam ? 'SPAM' : 'REJECT',
          targetId: opportunityId,
          reason: reason || (isSpam ? 'SPAM' : 'REJECTED')
        }
      });
    }

    return updated;
  });
}

/**
 * Approves a pending community submission: the linked opportunity is published
 * and its pending/rejected submission rows flip to PUBLISHED so the contributor's
 * history reads LIVE. MERGED rows are left alone — they keep pointing at the
 * listing they were folded into.
 */
export async function approveSubmission(opportunityId: string, adminId: string) {
  return await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true },
    });

    if (!opportunity) throw new Error('Opportunity not found');

    const published = await tx.opportunity.update({
      where: { id: opportunityId },
      data: {
        status: OpportunityStatus.PUBLISHED,
        publishedAt: new Date(),
        deletedAt: null,
        deletionReason: null,
      },
    });

    await tx.jobSubmission.updateMany({
      where: { opportunityId, status: { in: ['PENDING_REVIEW', 'REJECTED'] } },
      data: { status: 'PUBLISHED' },
    });

    const isRealAdmin = adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId);
    if (isRealAdmin) {
      await tx.adminAudit.create({
        data: {
          userId: adminId,
          action: 'APPROVE',
          targetId: opportunityId,
          reason: 'Community submission approved',
        },
      });
    }

    return published;
  });
}
