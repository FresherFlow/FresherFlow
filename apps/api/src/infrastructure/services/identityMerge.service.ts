import { IdentityMerger } from '@fresherflow/domain';
import { logger } from '@fresherflow/logger';

export class IdentityMergeService {
    /**
     * Merges an anonymous user's data into a permanent user account.
     * Delegates the core merge logic to the Domain package to ensure consistency.
     */
    static async mergeIdentities(anonUserId: string, permanentUserId: string) {
        if (!anonUserId || !permanentUserId || anonUserId === permanentUserId) return;

        try {
            // Call the domain-layer merger which handles transactions and deduplication
            await IdentityMerger.mergeAnonymousData(anonUserId, permanentUserId);
            
            logger.info(`[IdentityMerge] Successfully triggered domain merge for ${anonUserId} -> ${permanentUserId}`);
        } catch (error) {
            // We log but don't crash the auth flow if merging fails (best effort)
            logger.error(`[IdentityMerge] Failed to merge ${anonUserId} into ${permanentUserId}`, error);
        }
    }
}
