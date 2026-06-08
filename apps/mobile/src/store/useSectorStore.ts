import { create } from 'zustand';
import { getString, setString } from '@/utils/storage';
import { JobSector } from '@/utils/storage/scopedKeys';

const SECTOR_STORAGE_KEY = 'fresherflow_active_sector';

interface SectorStoreState {
    sector: JobSector | null; // null means the user hasn't selected a sector yet
    setSector: (sector: JobSector) => Promise<void>;
    hasHydrated: boolean;
    hydrate: () => void;
}

export const useSectorStore = create<SectorStoreState>((set, get) => ({
    sector: null,
    hasHydrated: false,

    setSector: async (sector: JobSector) => {
        setString(SECTOR_STORAGE_KEY, sector);
        set({ sector });
        
        // Re-configure API client for the new sector
        try {
            const { configureApiClientForSector } = require('@/config/api');
            configureApiClientForSector(sector);
        } catch (e) {
            console.warn('[useSectorStore] Failed to configure API client on sector change:', e);
        }
        
        // Swap the feed store's active cachedItems list instantly and perform a background sync
        try {
            const { useFeedStore } = require('./useFeedStore');
            const feedStore = useFeedStore.getState();
            const newItems = sector === 'GOVERNMENT' ? feedStore.govtCachedItems : feedStore.privateCachedItems;
            useFeedStore.setState({ 
                cachedItems: newItems,
                hasHydrated: true 
            });
            void feedStore.performSync(true);
        } catch (e) {
            console.warn('[useSectorStore] Failed to trigger feed change on sector change:', e);
        }
        
    },

    hydrate: () => {
        if (get().hasHydrated) return;
        const storedSector = getString(SECTOR_STORAGE_KEY) as JobSector | null;
        
        // If a valid sector is in storage, use it. Otherwise, default to PRIVATE explicitly.
        // This ensures new users who just finished onboarding don't get blocked by a mode switching screen.
        if (storedSector === 'GOVERNMENT') {
            set({ sector: 'GOVERNMENT', hasHydrated: true });
            try {
                const { configureApiClientForSector } = require('@/config/api');
                configureApiClientForSector('GOVERNMENT');
            } catch (e) {
                console.warn('[useSectorStore] Failed to configure API client on hydration:', e);
            }
        } else {
            set({ sector: 'PRIVATE', hasHydrated: true });
            try {
                const { configureApiClientForSector } = require('@/config/api');
                configureApiClientForSector('PRIVATE');
            } catch (e) {
                console.warn('[useSectorStore] Failed to configure default API client on hydration:', e);
            }
        }
    }
}));
