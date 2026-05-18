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

/**
 * IdentityMerger Service
 * Handles the consolidation of anonymous user data into permanent accounts.
 */
export class IdentityMerger {
    /**
     * Consolidates anonymous user data into a permanent account.
     * 
     * Logic:
     * - Transfers SavedJobs (SavedOpportunity) that don't already exist for the permanent user.
     * - Transfers InteractionHistory (UserAction) for jobs the permanent user hasn't interacted with.
     * - Reassigns all click events (OpportunityClick) to the permanent user.
     * - Deletes redundant anonymous records to maintain database integrity.
     * 
     * @param anonId The ID of the anonymous user.
     * @param permanentUserId The ID of the permanent account.
     */
    static async mergeAnonymousData(anonId: string, permanentUserId: string) {
        logger.info(`Starting identity merge: ${anonId} -> ${permanentUserId}`);

        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Fetch data for both identities
            const [anonSaved, permanentSaved] = await Promise.all([
                tx.savedOpportunity.findMany({ where: { userId: anonId } }),
                tx.savedOpportunity.findMany({ where: { userId: permanentUserId } })
            ]) as [MergeSavedOpportunity[], MergeSavedOpportunity[]];

            const [anonActions, permanentActions] = await Promise.all([
                tx.userAction.findMany({ where: { userId: anonId } }),
                tx.userAction.findMany({ where: { userId: permanentUserId } })
            ]) as [MergeUserAction[], MergeUserAction[]];

            // 2. Identify transferable items (avoiding unique constraint violations)
            const permanentSavedIds = new Set(permanentSaved.map(s => s.opportunityId));
            const permanentActionIds = new Set(permanentActions.map(a => a.opportunityId));

            const savedToTransfer = anonSaved.filter(s => !permanentSavedIds.has(s.opportunityId));
            const actionsToTransfer = anonActions.filter(a => !permanentActionIds.has(a.opportunityId));

            const savedToDiscard = anonSaved.filter(s => permanentSavedIds.has(s.opportunityId));
            const actionsToDiscard = anonActions.filter(a => permanentActionIds.has(a.opportunityId));

            // 3. Execute transfers
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

            // 4. Execute unified event reassignments (clicks, views, etc.)
            await tx.platformEvent.updateMany({
                where: { userId: anonId },
                data: { userId: permanentUserId }
            });

            // 5. Cleanup redundant anonymous records
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

            logger.info(`Identity merge complete for ${permanentUserId}. Transferred ${savedToTransfer.length} jobs and ${actionsToTransfer.length} actions.`);

            return {
                success: true,
                transferred: {
                    saved: savedToTransfer.length,
                    actions: actionsToTransfer.length
                },
                discarded: {
                    saved: savedToDiscard.length,
                    actions: actionsToDiscard.length
                }
            };
        });
    }
}
