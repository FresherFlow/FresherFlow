'use client';

import { useState, useEffect } from 'react';
import { getPendingOfflineActionsCount, subscribeOfflineActionQueue } from './actionQueue';

export function useOfflineActionQueue(ownerId?: string) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const updateCount = async () => {
            const newCount = await getPendingOfflineActionsCount(ownerId);
            setCount(newCount);
        };

        void updateCount();
        return subscribeOfflineActionQueue(() => {
            void updateCount();
        });
    }, [ownerId]);

    return count;
}

