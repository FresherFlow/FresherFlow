import { commentsApi } from '@fresherflow/api-client';
import { mutateJSON, getJSON } from './storage';

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
        const newItem: QueuedComment = {
            tempId,
            opportunityId,
            text,
            timestamp: Date.now(),
        };

        mutateJSON<QueuedComment[]>(COMMENT_QUEUE_KEY, (queue) => [...(queue || []), newItem]);
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
    return getJSON<QueuedComment[]>(COMMENT_QUEUE_KEY) || [];
};

/**
 * Removes a comment from the queue by its tempId.
 */
export const removeFromQueue = async (tempId: string) => {
    try {
        mutateJSON<QueuedComment[]>(COMMENT_QUEUE_KEY, (queue) => (queue || []).filter(item => item.tempId !== tempId));
    } catch (e) {
        console.warn('[CommentQueue] Failed to remove from queue', e);
    }
};

let isSyncing = false;

/**
 * Syncs the entire queue with the backend.
 * Returns the number of successfully synced comments.
 */
export const syncCommentQueue = async (): Promise<number> => {
    if (isSyncing) return 0;
    isSyncing = true;
    
    try {
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
                console.warn(`[CommentQueue] Failed to sync comment ${item.tempId}.`, (e as Error).message);
                const status = (e as { status?: number }).status;
                const isPermanentFailure = status && [400, 401, 403, 404, 409, 422].includes(status);
                
                if (isPermanentFailure) {
                    console.log(`[CommentQueue] Dropping poison pill ${item.tempId} due to permanent error: ${status}`);
                    await removeFromQueue(item.tempId);
                } else {
                    // Network error, timeout, 5xx, or rate limit -> break and retry later
                    break;
                }
            }
        }

        if (syncedCount > 0) {
            console.log(`[CommentQueue] Successfully synced ${syncedCount} comments.`);
        }

        return syncedCount;
    } finally {
        isSyncing = false;
    }
};

