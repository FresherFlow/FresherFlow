import AsyncStorage from '@react-native-async-storage/async-storage';
import { opportunitiesApi, profileApi } from '@fresherflow/api-client';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { getJSON, setJSON } from '@/utils/storage';

const SHARE_QUEUE_KEY = 'fresherflow_share_queue';

export interface QueuedShare {
    tempId: string;
    type: 'LINK' | 'REFERRAL';
    url?: string;
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
    type: 'LINK' | 'REFERRAL',
    data: { url?: string; referral?: QueuedShare['referral'] }
): Promise<string> => {
    try {
        const tempId = `temp_share_${Date.now()}`;
        const queue = await getShareQueue();
        
        const newItem: QueuedShare = {
            tempId,
            type,
            url: data.url,
            referral: data.referral,
            timestamp: Date.now(),
        };

        await AsyncStorage.setItem(SHARE_QUEUE_KEY, JSON.stringify([...queue, newItem]));
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
    try {
        const data = await AsyncStorage.getItem(SHARE_QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

/**
 * Removes a share from the queue by its tempId.
 */
export const removeFromQueue = async (tempId: string): Promise<void> => {
    try {
        const queue = await getShareQueue();
        const filtered = queue.filter(item => item.tempId !== tempId);
        await AsyncStorage.setItem(SHARE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.warn('[ShareQueue] Failed to remove from queue', e);
    }
};

/**
 * Syncs the entire share queue with the backend.
 * Returns the number of successfully synced shares.
 */
export const syncShareQueue = async (): Promise<number> => {
    const queue = await getShareQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    console.log(`[ShareQueue] Attempting to sync ${queue.length} shares...`);

    for (const item of queue) {
        try {
            if (item.type === 'LINK' && item.url) {
                const normalized = normalizeOpportunityUrl(item.url);
                const response = await opportunitiesApi.shareLink(normalized);
                
                // Add successfully submitted link to local cache if not duplicate
                if (!response.existing) {
                    const cachedList = getJSON<string[]>('fresherflow_submitted_links') || [];
                    if (!cachedList.includes(normalized)) {
                        cachedList.push(normalized);
                        setJSON('fresherflow_submitted_links', cachedList);
                    }
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
            }
            await removeFromQueue(item.tempId);
            syncedCount++;
        } catch (e) {
            console.warn(`[ShareQueue] Failed to sync share ${item.tempId}, will retry later.`, (e as Error).message);
            // Stop syncing if we hit a network error to avoid multiple failures
            const error = e as { status?: number };
            if (!error.status || error.status === 0) break;
        }
    }

    if (syncedCount > 0) {
        console.log(`[ShareQueue] Successfully synced ${syncedCount} shares.`);
    }

    return syncedCount;
};
