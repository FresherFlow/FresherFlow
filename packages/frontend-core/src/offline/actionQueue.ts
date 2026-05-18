import { ActionType, FeedbackReason } from '@fresherflow/types';
import { actionsApi, savedApi, feedbackApi, followsApi } from '@fresherflow/api-client';
import { storage } from '../lib/storage';


const OFFLINE_ACTION_QUEUE_KEY = 'ff_offline_action_queue_v1';
const MAX_RETRY_ATTEMPTS = 10;

type OfflineActionBase = {
    id: string;
    ownerId?: string;
    opportunityId: string;
    createdAt: number;
    attempts: number;
};

type SaveToggleAction = OfflineActionBase & {
    type: 'SAVE_TOGGLE';
};

type ActionTrack = OfflineActionBase & {
    type: 'ACTION_TRACK';
    actionType: ActionType;
};

type ActionRemove = OfflineActionBase & {
    type: 'ACTION_REMOVE';
};

type ReportSubmitAction = OfflineActionBase & {
    type: 'REPORT_SUBMIT';
    reason: FeedbackReason;
    description?: string;
};

type FollowAddAction = OfflineActionBase & {
    type: 'FOLLOW_ADD';
    followType: 'TAG' | 'COMPANY' | 'CONTRIBUTOR';
    value: string;
};

type FollowRemoveAction = OfflineActionBase & {
    type: 'FOLLOW_REMOVE';
    followType: 'TAG' | 'COMPANY' | 'CONTRIBUTOR';
    value: string;
};

type OfflineAction = SaveToggleAction | ActionTrack | ActionRemove | ReportSubmitAction | FollowAddAction | FollowRemoveAction;

type FlushResult = {
    synced: number;
    failed: number;
    remaining: number;
};

// Internal simple event emitter for cross-platform change notification
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

async function readQueue(): Promise<OfflineAction[]> {
    try {
        const raw = await storage.getItem(OFFLINE_ACTION_QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as OfflineAction[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function writeQueue(queue: OfflineAction[]) {
    await storage.setItem(OFFLINE_ACTION_QUEUE_KEY, JSON.stringify(queue));
    notify();
}

function nextId() {
    return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function matchesOwner(action: OfflineAction, ownerId?: string) {
    return !action.ownerId || !ownerId || action.ownerId === ownerId;
}

export async function enqueueOfflineSaveToggle(opportunityId: string, ownerId?: string) {
    const queue = await readQueue();
    const lastToggleIdx = [...queue].reverse().findIndex(
        (item) => item.type === 'SAVE_TOGGLE' && item.opportunityId === opportunityId && item.ownerId === ownerId
    );

    // Two toggles in a row for the same listing cancel each other out.
    if (lastToggleIdx >= 0) {
        const idx = queue.length - 1 - lastToggleIdx;
        queue.splice(idx, 1);
        await writeQueue(queue);
        return;
    }

    queue.push({
        id: nextId(),
        type: 'SAVE_TOGGLE',
        ownerId,
        opportunityId,
        createdAt: Date.now(),
        attempts: 0,
    });
    await writeQueue(queue);
}

export async function enqueueOfflineActionTrack(opportunityId: string, actionType: ActionType, ownerId?: string) {
    const existingQueue = await readQueue();
    const filteredQueue = existingQueue.filter((item) => {
        if (!matchesOwner(item, ownerId) || item.opportunityId !== opportunityId) return true;
        // Keep only latest state transition for a listing.
        return item.type !== 'ACTION_TRACK' && item.type !== 'ACTION_REMOVE';
    });

    filteredQueue.push({
        id: nextId(),
        type: 'ACTION_TRACK',
        ownerId,
        opportunityId,
        actionType,
        createdAt: Date.now(),
        attempts: 0,
    });
    await writeQueue(filteredQueue);
}

export async function enqueueOfflineActionRemove(opportunityId: string, ownerId?: string) {
    const existingQueue = await readQueue();
    const filteredQueue = existingQueue.filter((item) => {
        if (!matchesOwner(item, ownerId) || item.opportunityId !== opportunityId) return true;
        return item.type === 'SAVE_TOGGLE';
    });

    filteredQueue.push({
        id: nextId(),
        type: 'ACTION_REMOVE',
        ownerId,
        opportunityId,
        createdAt: Date.now(),
        attempts: 0,
    });
    await writeQueue(filteredQueue);
}

export async function enqueueOfflineReport(opportunityId: string, reason: FeedbackReason, description?: string, ownerId?: string) {
    const queue = await readQueue();
    queue.push({
        id: nextId(),
        type: 'REPORT_SUBMIT',
        ownerId,
        opportunityId,
        reason,
        description,
        createdAt: Date.now(),
        attempts: 0,
    });
    await writeQueue(queue);
}

export async function enqueueOfflineFollowAdd(type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string, ownerId?: string) {
    const queue = await readQueue();
    const exists = queue.some(item => item.type === 'FOLLOW_ADD' && (item as any).followType === type && (item as any).value === value && item.ownerId === ownerId);
    if (exists) return;

    const unfollowIdx = queue.findIndex(item => item.type === 'FOLLOW_REMOVE' && (item as any).followType === type && (item as any).value === value && item.ownerId === ownerId);
    if (unfollowIdx >= 0) {
        queue.splice(unfollowIdx, 1);
        await writeQueue(queue);
        return;
    }

    queue.push({
        id: nextId(),
        type: 'FOLLOW_ADD',
        ownerId,
        opportunityId: 'follow_' + type.toLowerCase() + '_' + value.replace(/\s+/g, '_'),
        followType: type,
        value,
        createdAt: Date.now(),
        attempts: 0,
    } as any);
    await writeQueue(queue);
}

export async function enqueueOfflineFollowRemove(type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string, ownerId?: string) {
    const queue = await readQueue();
    const exists = queue.some(item => item.type === 'FOLLOW_REMOVE' && (item as any).followType === type && (item as any).value === value && item.ownerId === ownerId);
    if (exists) return;

    const followIdx = queue.findIndex(item => item.type === 'FOLLOW_ADD' && (item as any).followType === type && (item as any).value === value && item.ownerId === ownerId);
    if (followIdx >= 0) {
        queue.splice(followIdx, 1);
        await writeQueue(queue);
        return;
    }

    queue.push({
        id: nextId(),
        type: 'FOLLOW_REMOVE',
        ownerId,
        opportunityId: 'unfollow_' + type.toLowerCase() + '_' + value.replace(/\s+/g, '_'),
        followType: type,
        value,
        createdAt: Date.now(),
        attempts: 0,
    } as any);
    await writeQueue(queue);
}

export async function getPendingOfflineActionsCount(ownerId?: string): Promise<number> {
    const queue = await readQueue();
    return queue.filter((item) => matchesOwner(item, ownerId)).length;
}

export function subscribeOfflineActionQueue(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

async function runOfflineAction(action: OfflineAction) {
    if (action.type === 'SAVE_TOGGLE') {
        let details: any = null;
        try {
            if (typeof (global as any).readJobDetailsFromCache === 'function') {
                details = await (global as any).readJobDetailsFromCache(action.opportunityId);
            }
        } catch (e) {
            console.error('[ActionQueue] Global cache reader failed:', e);
        }

        if (!details) {
            try {
                const { readDetailCache, readSavedJobs } = require('./native');
                details = await readDetailCache(action.opportunityId);
                if (!details) {
                    const saved = await readSavedJobs();
                    details = saved.find((j: any) => j.id === action.opportunityId) || null;
                }
            } catch {
                // Silently fallback if not available
            }
        }
        await savedApi.toggle(action.opportunityId, details || undefined);
        return;
    }
    if (action.type === 'ACTION_TRACK') {
        await actionsApi.track(action.opportunityId, action.actionType);
        return;
    }
    if (action.type === 'ACTION_REMOVE') {
        await actionsApi.remove(action.opportunityId);
        return;
    }
    if (action.type === 'REPORT_SUBMIT') {
        await feedbackApi.submit(action.opportunityId, action.reason, action.description);
        return;
    }
    if (action.type === 'FOLLOW_ADD') {
        const act = action as any;
        await followsApi.follow({ type: act.followType, value: act.value });
        return;
    }
    if (action.type === 'FOLLOW_REMOVE') {
        const act = action as any;
        await followsApi.unfollow({ type: act.followType, value: act.value });
        return;
    }
}

export async function flushOfflineActions(ownerId?: string): Promise<FlushResult> {
    const queue = await readQueue();
    if (!queue.length) return { synced: 0, failed: 0, remaining: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: OfflineAction[] = [];
    let authFailed = false;

    for (const action of queue) {
        if (!matchesOwner(action, ownerId)) {
            remaining.push(action);
            continue;
        }
        try {
            await runOfflineAction(action);
            synced += 1;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            if (message.includes('session expired') || message.includes('unauthorized') || message.includes('401')) {
                authFailed = true;
                remaining.push(action, ...queue.slice(queue.indexOf(action) + 1));
                break;
            }
            failed += 1;
            if (action.attempts + 1 < MAX_RETRY_ATTEMPTS) {
                remaining.push({
                    ...action,
                    attempts: action.attempts + 1,
                });
            }
        }
    }

    await writeQueue(remaining);
    return {
        synced,
        failed: authFailed ? failed + 1 : failed,
        remaining: remaining.length,
    };
}
