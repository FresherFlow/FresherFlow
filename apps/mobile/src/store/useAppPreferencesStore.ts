import { create } from 'zustand';
import { getString, setString } from '@/utils/storage';

export type TabId = 'Feed' | 'Explore' | 'Share' | 'Saved' | 'Profile';
export type FeedTabId = 'latest' | 'for_you' | 'trending' | 'closing_soon' | 'remote' | '2026' | 'internships' | 'central' | 'state' | 'banking';

interface AppPreferencesState {
  hiddenTabs: TabId[];
  hiddenFeedTabs: FeedTabId[];
  hasHydrated: boolean;
  toggleTabVisibility: (tabId: TabId) => void;
  toggleFeedTabVisibility: (tabId: FeedTabId) => void;
  hydrate: () => void;
}

export const useAppPreferencesStore = create<AppPreferencesState>((set, get) => ({
  hiddenTabs: [],
  hiddenFeedTabs: [],
  hasHydrated: false,
  
  toggleTabVisibility: (tabId) => {
    // We don't allow hiding Profile because it contains settings
    if (tabId === 'Profile') return;

    const { hiddenTabs } = get();
    const newTabs = hiddenTabs.includes(tabId) 
      ? hiddenTabs.filter(id => id !== tabId)
      : [...hiddenTabs, tabId];
    
    setString('hidden_tabs_pref', JSON.stringify(newTabs));
    set({ hiddenTabs: newTabs });
  },

  toggleFeedTabVisibility: (tabId) => {
    // We don't allow hiding 'for_you'
    if (tabId === 'for_you') return;

    const { hiddenFeedTabs } = get();
    const newTabs = hiddenFeedTabs.includes(tabId)
        ? hiddenFeedTabs.filter(id => id !== tabId)
        : [...hiddenFeedTabs, tabId];

    setString('hidden_feed_tabs_pref', JSON.stringify(newTabs));
    set({ hiddenFeedTabs: newTabs });
  },

  hydrate: () => {
    try {
      const storedTabs = getString('hidden_tabs_pref');
      const parsedTabs = storedTabs ? JSON.parse(storedTabs) : [];
      
      const storedFeedTabs = getString('hidden_feed_tabs_pref');
      const parsedFeedTabs = storedFeedTabs ? JSON.parse(storedFeedTabs) : [];

      set({ 
        hiddenTabs: Array.isArray(parsedTabs) ? parsedTabs : [], 
        hiddenFeedTabs: Array.isArray(parsedFeedTabs) ? parsedFeedTabs : [],
        hasHydrated: true 
      });
    } catch {
      set({ hiddenTabs: [], hiddenFeedTabs: [], hasHydrated: true });
    }
  }
}));
