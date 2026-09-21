'use client';

import { useSyncExternalStore } from 'react';
import { getPendingOfflineActionsCount, subscribeOfflineActionQueue } from '@/lib/cache/actionQueue';

export function useOfflineActionQueue(ownerId?: string) {
    return useSyncExternalStore(
        subscribeOfflineActionQueue,
        () => getPendingOfflineActionsCount(ownerId),
        () => 0
    );
}
