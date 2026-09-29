import prisma from '../../infrastructure/database/prisma';
import { determineTrustLevel, calculateNewTrustScore } from '@fresherflow/utils';
import { OpportunityStatus } from '@fresherflow/types';
import { NotificationType } from '@fresherflow/database';

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
    // Anonymous/imported opportunities have no author, so there is no
    // reputation to adjust. Skip rather than look up a null id.
    const contributor = opportunity.postedByUserId
      ? await tx.user.findUnique({
          where: { id: opportunity.postedByUserId },
          select: { id: true, trustScore: true }
        })
      : null;

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

    // 4. Tell the submitters their job is live. One notification per real
    // user: guest rows are attributed to the shared community account (never
    // notified), and re-approvals skip users who already have an unread one.
    // Rides JOB_UPDATED with a payload flag — a new enum value would need a
    // DB migration, and the web tab keys off the flag first (see
    // NotificationsTab toDisplayItem).
    const submissions = await tx.jobSubmission.findMany({
      where: { opportunityId },
      select: { submittedById: true },
    });
    const submitterIds = [...new Set(
      submissions.map((s) => s.submittedById).filter((id): id is string => !!id),
    )];
    if (submitterIds.length > 0) {
      const bot = await tx.user.findFirst({
        where: { OR: [{ email: 'community@fresherflow.app' }, { username: 'fresherflow_community' }] },
        select: { id: true },
      });
      const realIds = bot ? submitterIds.filter((id) => id !== bot.id) : submitterIds;
      if (realIds.length > 0) {
        const alreadyNotified = await tx.notification.findMany({
          where: {
            opportunityId,
            userId: { in: realIds },
            readAt: null,
            payload: { path: ['submissionPublished'], equals: true },
          },
          select: { userId: true },
        });
        const notifiedSet = new Set(alreadyNotified.map((n) => n.userId));
        const freshIds = realIds.filter((id) => !notifiedSet.has(id));
        if (freshIds.length > 0) {
          await tx.notification.createMany({
            data: freshIds.map((userId) => ({
              userId,
              type: NotificationType.JOB_UPDATED,
              opportunityId,
              payload: { submissionPublished: true },
            })),
          });
        }
      }
    }

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
