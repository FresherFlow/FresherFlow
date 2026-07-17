import { create } from 'zustand';
import { Opportunity, ActionType } from '@fresherflow/types';
import { useNotificationStore } from './useNotificationStore';
import { saveLastSyncTimestamp, readTrackerCacheSync, readFeedCacheSync } from '@/utils/cache/offlineCache';
import { diffAndNotify } from '@/utils/cache/localNotifications';
import { getLocalProfile } from '@/utils/cache/localProfile';
import { useSectorStore } from './useSectorStore';
import { getString, setString } from '@/utils/storage';
import { getSeenIds, getOpenedIds, getSeenIdsSync, getOpenedIdsSync, markJobAsOpened, markJobAsSeen } from '@/utils/cache/seenJobs';
import { getRecentSearchKeywords } from '@/utils/userBehavior';
import { useAuthStore } from './useAuthStore';
import { OfflineSyncModule } from '@/utils/cache/syncModule';

interface FeedStoreState {
    cachedItems: Opportunity[];
    privateCachedItems: Opportunity[];
    govtCachedItems: Opportunity[];
    seenIds: Set<string>;
    openedIds: Set<string>;
    appliedIds: Set<string>;
    recentKeywords: string[];
    isBootstrapping: boolean;
    isSyncing: boolean;
    isRefreshing: boolean;
    syncError: string | null;
    hasHydrated: boolean;

    cleanupOrphanedLogos: () => Promise<void>;
    hydrate: () => Promise<void>;
    performSync: (force?: boolean, isUserInitiated?: boolean) => Promise<void>;
    recalculateScores: () => Promise<void>;
    refreshBehavioralData: () => Promise<void>;
    markAsOpened: (id: string) => Promise<void>;
}

// Synchronously read initial cache & behavioral state from MMKV on startup
const getInitialFeedState = () => {
    try {
        const storedSector = getString('fresherflow_active_sector') || 'PRIVATE';
        const cachedPrivate = readFeedCacheSync('PRIVATE');
        const cachedGovt = readFeedCacheSync('GOVERNMENT');
        const privateItems = cachedPrivate?.items || [];
        const govtItems = cachedGovt?.items || [];
        const activeItems = storedSector === 'GOVERNMENT' ? govtItems : privateItems;

        const seen = getSeenIdsSync();
        const opened = getOpenedIdsSync();
        const applied = new Set<string>();
        try {
            const trackerCache = readTrackerCacheSync();
            if (trackerCache?.items) {
                (trackerCache.items as Array<{ actionType: ActionType; opportunityId?: string; opportunity?: { id?: string } }>).forEach((item) => {
                    if (item?.actionType === ActionType.APPLIED) {
                        const id = item?.opportunityId || item?.opportunity?.id;
                        if (id) applied.add(id);
                    }
                });
            }
        } catch {}

        const keywords = getRecentSearchKeywords();

        return {
            cachedItems: activeItems,
            privateCachedItems: privateItems,
            govtCachedItems: govtItems,
            seenIds: seen,
            openedIds: opened,
            appliedIds: applied,
            recentKeywords: keywords,
            isBootstrapping: activeItems.length === 0,
            hasHydrated: true,
        };
    } catch (e) {
        return {
            cachedItems: [],
            privateCachedItems: [],
            govtCachedItems: [],
            seenIds: new Set<string>(),
            openedIds: new Set<string>(),
            appliedIds: new Set<string>(),
            recentKeywords: [],
            isBootstrapping: true,
            hasHydrated: false,
        };
    }
};

const initialFeedState = getInitialFeedState();

export const useFeedStore = create<FeedStoreState>((set, get) => ({
    ...initialFeedState,
    isSyncing: false,
    isRefreshing: false,
    syncError: null,

    cleanupOrphanedLogos: async () => {
        const { cachedItems } = get();
        await OfflineSyncModule.cleanupOrphanedLogos(cachedItems);
    },

    recalculateScores: async () => {
        const { cachedItems } = get();
        if (cachedItems && cachedItems.length > 0) {
            const userId = useAuthStore.getState().user?.id;
            const profile = await getLocalProfile(userId);
            const activeSector = useSectorStore.getState().sector || 'PRIVATE';
            
            const scored = await OfflineSyncModule.scoreAndCacheFeed(cachedItems, profile, activeSector as 'PRIVATE' | 'GOVERNMENT');
            if (activeSector === 'GOVERNMENT') {
                set({ govtCachedItems: scored, cachedItems: scored });
            } else {
                set({ privateCachedItems: scored, cachedItems: scored });
            }
        }
    },

    refreshBehavioralData: async () => {
        const [seen, opened] = await Promise.all([getSeenIds(), getOpenedIds()]);
        
        const applied = new Set<string>();
        try {
            const trackerCache = readTrackerCacheSync();
            if (trackerCache?.items) {
                (trackerCache.items as Array<{ actionType: ActionType; opportunityId?: string; opportunity?: { id?: string } }>).forEach((item) => {
                    if (item?.actionType === ActionType.APPLIED) {
                        const id = item?.opportunityId || item?.opportunity?.id;
                        if (id) applied.add(id);
                    }
                });
            }
        } catch (e) {
            if (__DEV__) { console.warn('[useFeedStore] Failed to parse tracker cache for applied IDs:', e) }
        }

        const keywords = getRecentSearchKeywords();

        set({
            seenIds: seen,
            openedIds: opened,
            appliedIds: applied,
            recentKeywords: keywords
        });
    },

    markAsOpened: async (id: string) => {
        // Optimistic update: dim the card immediately, then persist to disk
        const nextOpened = new Set(get().openedIds);
        nextOpened.add(id);
        const nextSeen = new Set(get().seenIds);
        nextSeen.add(id);
        set({ openedIds: nextOpened, seenIds: nextSeen });

        try {
            await markJobAsOpened(id);
            await markJobAsSeen(id);
        } catch (e) {
            if (__DEV__) { console.error('[useFeedStore] Failed to persist opened state:', e) }
        }
    },

    performSync: async (force = false, isUserInitiated = false) => {
        const { isSyncing } = get();
        if (isSyncing) return; // Prevent concurrent syncs

        const activeSector = useSectorStore.getState().sector || 'PRIVATE';
        const lastSyncKey = `fresherflow_last_sync_timestamp_${activeSector.toLowerCase()}`;
        const lastSyncStr = getString(lastSyncKey);
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Date.now();
        
        if (!force && now - lastSync < 300000 && get().cachedItems.length > 0) return;

        if (isUserInitiated) {
            set({ isRefreshing: true });
        }
        set({ isSyncing: true, syncError: null });

        try {
            const feedData = await OfflineSyncModule.fetchRawFeed(activeSector as 'PRIVATE' | 'GOVERNMENT');
            if (feedData?.opportunities) {
                const userId = useAuthStore.getState().user?.id;
                const profile = await getLocalProfile(userId);
                
                const scoredOpportunities = await OfflineSyncModule.scoreAndCacheFeed(
                    feedData.opportunities, 
                    profile, 
                    activeSector as 'PRIVATE' | 'GOVERNMENT'
                );
                
                if (scoredOpportunities.length > 0) {
                    if (activeSector === 'GOVERNMENT') {
                        set({ govtCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
                    } else {
                        set({ privateCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
                    }

                    // Background operations
                    setTimeout(() => {
                        void OfflineSyncModule.triggerLogoPrefetch(scoredOpportunities.slice(0, 10));
                        setTimeout(() => {
                            void OfflineSyncModule.triggerLogoPrefetch(scoredOpportunities.slice(10));
                            void get().cleanupOrphanedLogos();
                        }, 2000);
                    }, 3000);

                    void diffAndNotify(scoredOpportunities).then(() => {
                        void useNotificationStore.getState().fetchUnreadCount();
                    });
                }

                await saveLastSyncTimestamp((feedData.timestamp || now).toString());
                setString(lastSyncKey, now.toString());
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            if (__DEV__) console.warn('[useFeedStore] Feed sync failed:', errMsg);
            set({ syncError: errMsg });
        } finally {
            set({ isSyncing: false, isRefreshing: false });
        }
    },

    hydrate: async () => {
        const { performSync } = get();
        // Since we are already hydrated synchronously from MMKV, we just trigger a background sync on app start.
        if (get().cachedItems.length > 0) {
            void performSync();
        } else {
            set({ isBootstrapping: true });
            await performSync();
            set({ isBootstrapping: false });
        }
    }
}));
