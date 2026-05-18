import AsyncStorage from '@react-native-async-storage/async-storage';
import { commentsApi } from '@fresherflow/api-client';

const COMMENT_QUEUE_KEY = 'fresherflow_comment_queue';

export interface QueuedComment {
    tempId: string;
    opportunityId: string;
    text: string;
    timestamp: number;
}

/**
 * Adds a comment to the offline retry queue.
 */
export const queueComment = async (opportunityId: string, text: string): Promise<string> => {
    try {
        const tempId = `temp_${Date.now()}`;
        const queue = await getCommentQueue();
        
        const newItem: QueuedComment = {
            tempId,
            opportunityId,
            text,
            timestamp: Date.now(),
        };

        await AsyncStorage.setItem(COMMENT_QUEUE_KEY, JSON.stringify([...queue, newItem]));
        return tempId;
    } catch (e) {
        console.warn('[CommentQueue] Failed to queue comment', e);
        return `temp_${Date.now()}`;
    }
};

/**
 * Retrieves all queued comments.
 */
export const getCommentQueue = async (): Promise<QueuedComment[]> => {
    try {
        const data = await AsyncStorage.getItem(COMMENT_QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

/**
 * Removes a comment from the queue by its tempId.
 */
export const removeFromQueue = async (tempId: string) => {
    try {
        const queue = await getCommentQueue();
        const filtered = queue.filter(item => item.tempId !== tempId);
        await AsyncStorage.setItem(COMMENT_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.warn('[CommentQueue] Failed to remove from queue', e);
    }
};

/**
 * Syncs the entire queue with the backend.
 * Returns the number of successfully synced comments.
 */
export const syncCommentQueue = async (): Promise<number> => {
    const queue = await getCommentQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    console.log(`[CommentQueue] Attempting to sync ${queue.length} comments...`);

    for (const item of queue) {
        try {
            await commentsApi.post(item.opportunityId, item.text);
            await removeFromQueue(item.tempId);
            syncedCount++;
        } catch (e) {
            console.warn(`[CommentQueue] Failed to sync comment ${item.tempId}, will retry later.`, (e as Error).message);
            // Stop syncing if we hit a network error to avoid multiple failures
            const error = e as { status?: number };
            if (!error.status || error.status === 0) break;
        }
    }

    if (syncedCount > 0) {
        console.log(`[CommentQueue] Successfully synced ${syncedCount} comments.`);
    }

    return syncedCount;
}

