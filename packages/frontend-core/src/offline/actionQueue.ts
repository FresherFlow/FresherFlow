import { ActionType } from '@fresherflow/types';
import { actionsApi, savedApi } from '@fresherflow/api-client';
import { storage } from '../lib/storage';
import { Platform } from 'react-native';

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

type OfflineAction = SaveToggleAction | ActionTrack | ActionRemove;

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
        await savedApi.toggle(action.opportunityId);
        return;
    }
    if (action.type === 'ACTION_TRACK') {
        await actionsApi.track(action.opportunityId, action.actionType);
        return;
    }
    await actionsApi.remove(action.opportunityId);
}

export async function flushOfflineActions(ownerId?: string): Promise<FlushResult> {
    const queue = await readQueue();
    if (!queue.length) return { synced: 0, failed: 0, remaining: 0 };
    
    // Check connectivity - navigator.onLine is web-only, but we're mostly worried about API accessibility anyway
    // In React Native, NetInfo should be used, but for now we rely on the catch block.

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

