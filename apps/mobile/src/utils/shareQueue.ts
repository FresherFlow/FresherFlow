import { opportunitiesApi, profileApi, resourcesApi } from '@fresherflow/api-client';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { getJSON, mutateJSON } from '@/utils/storage';

const SHARE_QUEUE_KEY = 'fresherflow_share_queue';

export interface QueuedShare {
    tempId: string;
    type: 'LINK' | 'REFERRAL' | 'RESOURCE';
    url?: string;
    title?: string;
    company?: string;
    skills?: string[];
    submittedByUserId?: string;
    submittedByUsername?: string;
    referral?: {
        title: string;
        company: string;
        contact: string;
        description: string;
        companyUrl?: string;
        eligibleBatches?: string;
    };
    timestamp: number;
}

/**
 * Adds a share (link or referral) to the offline queue.
 */
export const queueShare = async (
    type: 'LINK' | 'REFERRAL' | 'RESOURCE',
    data: { 
        url?: string; 
        title?: string; 
        company?: string; 
        skills?: string[];
        submittedByUserId?: string;
        submittedByUsername?: string;
        referral?: QueuedShare['referral'] 
    }
): Promise<string> => {
    try {
        const tempId = `temp_share_${Date.now()}`;
        
        const newItem: QueuedShare = {
            tempId,
            type,
            url: data.url,
            title: data.title,
            company: data.company,
            skills: data.skills,
            submittedByUserId: data.submittedByUserId,
            submittedByUsername: data.submittedByUsername,
            referral: data.referral,
            timestamp: Date.now(),
        };

        mutateJSON<QueuedShare[]>(SHARE_QUEUE_KEY, (queue) => [...(queue || []), newItem]);
        return tempId;
    } catch (e) {
        console.warn('[ShareQueue] Failed to queue share', e);
        return `temp_share_${Date.now()}`;
    }
};

/**
 * Retrieves all queued shares.
 */
export const getShareQueue = async (): Promise<QueuedShare[]> => {
    return getJSON<QueuedShare[]>(SHARE_QUEUE_KEY) || [];
};

/**
 * Removes a share from the queue by its tempId.
 */
export const removeFromQueue = async (tempId: string): Promise<void> => {
    try {
        mutateJSON<QueuedShare[]>(SHARE_QUEUE_KEY, (queue) => (queue || []).filter(item => item.tempId !== tempId));
    } catch (e) {
        console.warn('[ShareQueue] Failed to remove from queue', e);
    }
};

let isSyncing = false;

/**
 * Syncs the entire share queue with the backend.
 * Returns the number of successfully synced shares.
 */
export const syncShareQueue = async (): Promise<number> => {
    if (isSyncing) return 0;
    isSyncing = true;
    
    try {
        const queue = await getShareQueue();
        if (queue.length === 0) return 0;

        let syncedCount = 0;
        console.log(`[ShareQueue] Attempting to sync ${queue.length} shares...`);

        for (const item of queue) {
            try {
                if (item.type === 'LINK' && item.url) {
                    const normalized = normalizeOpportunityUrl(item.url);
                    const response = await opportunitiesApi.shareLink(normalized, item.title, item.company);
                    
                    // Add successfully submitted link to local cache if not duplicate
                    if (!response.existing) {
                        mutateJSON<string[]>('fresherflow_submitted_links', (cachedList) => {
                            const list = cachedList || [];
                            if (!list.includes(normalized)) {
                                list.push(normalized);
                            }
                            return list;
                        });
                    }
                } else if (item.type === 'REFERRAL' && item.referral) {
                    await profileApi.submitShare({
                        referral: {
                            title: item.referral.title,
                            company: item.referral.company,
                            contact: item.referral.contact,
                            description: item.referral.description,
                            companyUrl: item.referral.companyUrl,
                            eligibleBatches: item.referral.eligibleBatches,
                        }
                    });
                } else if (item.type === 'RESOURCE' && item.url) {
                    await resourcesApi.submit(item.url);
                }
                await removeFromQueue(item.tempId);
                syncedCount++;
            } catch (e) {
                console.warn(`[ShareQueue] Failed to sync share ${item.tempId}.`, (e as Error).message);
                const status = (e as { status?: number }).status;
                const isPermanentFailure = status && [400, 401, 403, 404, 409, 422].includes(status);
                
                if (isPermanentFailure) {
                    console.log(`[ShareQueue] Dropping poison pill ${item.tempId} due to permanent error: ${status}`);
                    await removeFromQueue(item.tempId);
                } else {
                    // Network error, timeout, 5xx, or rate limit -> break and retry later
                    break;
                }
            }
        }

        if (syncedCount > 0) {
            console.log(`[ShareQueue] Successfully synced ${syncedCount} shares.`);
        }

        return syncedCount;
    } finally {
        isSyncing = false;
    }
};
