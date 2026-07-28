import { prisma, Prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';

type MergeSavedOpportunity = {
    id: string;
    opportunityId: string;
};

type MergeUserAction = {
    id: string;
    opportunityId: string;
};

export class IdentityMergeService {
    /**
     * Merges an anonymous user's data into a permanent user account.
     */
    static async mergeIdentities(anonUserId: string, permanentUserId: string) {
        if (!anonUserId || !permanentUserId || anonUserId === permanentUserId) return;

        try {
            logger.info(`[IdentityMerge] Starting identity merge: ${anonUserId} -> ${permanentUserId}`);

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const [anonSaved, permanentSaved] = await Promise.all([
                    tx.savedOpportunity.findMany({ where: { userId: anonUserId } }),
                    tx.savedOpportunity.findMany({ where: { userId: permanentUserId } })
                ]) as [MergeSavedOpportunity[], MergeSavedOpportunity[]];

                const [anonActions, permanentActions] = await Promise.all([
                    tx.userAction.findMany({ where: { userId: anonUserId } }),
                    tx.userAction.findMany({ where: { userId: permanentUserId } })
                ]) as [MergeUserAction[], MergeUserAction[]];

                const permanentSavedIds = new Set(permanentSaved.map(s => s.opportunityId));
                const permanentActionIds = new Set(permanentActions.map(a => a.opportunityId));

                const savedToTransfer = anonSaved.filter(s => !permanentSavedIds.has(s.opportunityId));
                const actionsToTransfer = anonActions.filter(a => !permanentActionIds.has(a.opportunityId));

                const savedToDiscard = anonSaved.filter(s => permanentSavedIds.has(s.opportunityId));
                const actionsToDiscard = anonActions.filter(a => permanentActionIds.has(a.opportunityId));

                if (savedToTransfer.length > 0) {
                    await tx.savedOpportunity.updateMany({
                        where: { id: { in: savedToTransfer.map(s => s.id) } },
                        data: { userId: permanentUserId }
                    });
                }

                if (actionsToTransfer.length > 0) {
                    await tx.userAction.updateMany({
                        where: { id: { in: actionsToTransfer.map(a => a.id) } },
                        data: { userId: permanentUserId }
                    });
                }

                await tx.platformEvent.updateMany({
                    where: { userId: anonUserId },
                    data: { userId: permanentUserId }
                });

                if (savedToDiscard.length > 0) {
                    await tx.savedOpportunity.deleteMany({
                        where: { id: { in: savedToDiscard.map(s => s.id) } }
                    });
                }

                if (actionsToDiscard.length > 0) {
                    await tx.userAction.deleteMany({
                        where: { id: { in: actionsToDiscard.map(a => a.id) } }
                    });
                }

                logger.info(`[IdentityMerge] Merge complete for ${permanentUserId}. Transferred ${savedToTransfer.length} jobs and ${actionsToTransfer.length} actions.`);
            });
        } catch (error) {
            logger.error(`[IdentityMerge] Failed to merge ${anonUserId} into ${permanentUserId}`, error);
        }
    }
}
