import { useEffect, useState, useCallback } from 'react';
import { ActionType, Opportunity } from '@fresherflow/types';
import { readTrackerCacheSync, saveTrackerCache, readDetailCache } from '@/utils/offlineCache';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { subscribeToFirebaseTracker, writeFirebaseTrackerItem, removeFirebaseTrackerItem } from '@/utils/firebaseTrackerDb';
import * as Haptics from 'expo-haptics';

export interface TrackerAction {
    id: string;
    actionType: ActionType;
    createdAt: string;
    opportunityId: string;
    opportunity?: Opportunity;
}

export const useTracker = () => {
    const { user } = useAuthStore();
    const [items, setItems] = useState<TrackerAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const isAnonymous = !user || user.isAnonymous;

    // Load initial local cache on mount
    useEffect(() => {
        const cached = readTrackerCacheSync();
        if (cached?.items) {
            setItems(cached.items as TrackerAction[]);
            setLoading(false);
        }
    }, []);

    // Firebase subscription
    useEffect(() => {
        if (isAnonymous || !user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToFirebaseTracker(user.id, async (trackerMap) => {
            try {
                const cachedOpportunities = useFeedStore.getState().cachedItems;
                const mappedActions: TrackerAction[] = [];

                for (const [opportunityId, trackerItem] of Object.entries(trackerMap)) {
                    // Match against CDN feed list
                    let opp = cachedOpportunities.find(o => o.id === opportunityId);
                    if (!opp) {
                        // Fallback: Try reading from detail cache
                        opp = (await readDetailCache(opportunityId)) || undefined;
                    }

                    mappedActions.push({
                        id: opportunityId,
                        actionType: trackerItem.status,
                        createdAt: new Date(trackerItem.updatedAt).toISOString(),
                        opportunityId,
                        opportunity: opp,
                    });
                }

                // Sort by updatedAt desc
                mappedActions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setItems(mappedActions);
                void saveTrackerCache(mappedActions);
                
                // Keep useFeedStore behavioral data in sync!
                void useFeedStore.getState().refreshBehavioralData();
            } catch (err) {
                console.warn('[useTracker] Subscription mapping failed:', err);
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, [user?.id, isAnonymous]);

    const isTracking = useCallback((opportunityId: string) => {
        return items.some(item => item.opportunityId === opportunityId);
    }, [items]);

    const getStatus = useCallback((opportunityId: string): ActionType | null => {
        const item = items.find(item => item.opportunityId === opportunityId);
        return item?.actionType || null;
    }, [items]);

    const toggleTracking = useCallback(async (opportunity: Opportunity, status?: ActionType) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const currentlyTracking = isTracking(opportunity.id);

        if (isAnonymous) {
            // Support local offline-first demo state for guests
            let updated: TrackerAction[];
            if (currentlyTracking && !status) {
                updated = items.filter(item => item.opportunityId !== opportunity.id);
            } else {
                const targetStatus = status || ActionType.PLANNED;
                updated = [
                    {
                        id: opportunity.id,
                        actionType: targetStatus,
                        createdAt: new Date().toISOString(),
                        opportunityId: opportunity.id,
                        opportunity,
                    },
                    ...items.filter(item => item.opportunityId !== opportunity.id)
                ];
            }
            setItems(updated);
            void saveTrackerCache(updated);
            void useFeedStore.getState().refreshBehavioralData();
            return;
        }

        if (!user?.id) return;

        setUpdating(true);
        try {
            if (currentlyTracking && !status) {
                await removeFirebaseTrackerItem(user.id, opportunity.id);
            } else {
                const targetStatus = status || ActionType.PLANNED;
                await writeFirebaseTrackerItem(user.id, opportunity.id, targetStatus);
            }
        } finally {
            setUpdating(false);
        }
    }, [isTracking, items, user?.id, isAnonymous]);

    const updateStatus = useCallback(async (opportunityId: string, status: ActionType) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isAnonymous) {
            const updated = items.map(item => 
                item.opportunityId === opportunityId ? { ...item, actionType: status } : item
            );
            setItems(updated);
            void saveTrackerCache(updated);
            void useFeedStore.getState().refreshBehavioralData();
            return;
        }

        if (!user?.id) return;

        setUpdating(true);
        try {
            await writeFirebaseTrackerItem(user.id, opportunityId, status);
        } finally {
            setUpdating(false);
        }
    }, [items, user?.id, isAnonymous]);

    const removeAction = useCallback(async (opportunityId: string) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (isAnonymous) {
            const updated = items.filter(item => item.opportunityId !== opportunityId);
            setItems(updated);
            void saveTrackerCache(updated);
            void useFeedStore.getState().refreshBehavioralData();
            return;
        }

        if (!user?.id) return;

        setUpdating(true);
        try {
            await removeFirebaseTrackerItem(user.id, opportunityId);
        } finally {
            setUpdating(false);
        }
    }, [items, user?.id, isAnonymous]);

    const onRefresh = useCallback(async () => {
        return Promise.resolve();
    }, []);

    return {
        actions: items,
        loading,
        refreshing: false,
        error: null,
        refresh: onRefresh,
        isTracking,
        getStatus,
        toggleTracking,
        updateStatus,
        removeAction,
        updating,
    };
};

