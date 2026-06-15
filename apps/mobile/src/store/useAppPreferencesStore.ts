import { create } from 'zustand';
import { getString, setString } from '@/utils/storage';

export type TabId = 'Feed' | 'Explore' | 'Share' | 'Saved' | 'Profile';
export type FeedTabId = string;

export interface CustomFeedTab {
  id: string; // e.g. 'walkins', '2024', '2025'
  label: string; // e.g. 'Walk-ins', '2024 Batch', '2025 Batch'
}

/** Bump this whenever TabId or FeedTabId values are renamed/added/removed.
 *  A version mismatch on hydration will reset prefs to defaults, preventing
 *  hidden-tab bugs caused by stale string IDs from old app versions. */
const PREFS_VERSION = '4';

interface AppPreferencesState {
  hiddenTabs: TabId[];
  hiddenFeedTabs: FeedTabId[];
  feedTabsOrder: FeedTabId[];
  customFeedTabs: CustomFeedTab[];
  hasHydrated: boolean;
  toggleTabVisibility: (tabId: TabId) => void;
  toggleFeedTabVisibility: (tabId: FeedTabId) => void;
  setFeedTabsOrder: (order: FeedTabId[]) => void;
  addCustomFeedTab: (tab: CustomFeedTab) => void;
  removeCustomFeedTab: (id: string) => void;
  hydrate: () => void;
}

export const useAppPreferencesStore = create<AppPreferencesState>((set, get) => ({
  hiddenTabs: [],
  hiddenFeedTabs: ['walkins'],
  feedTabsOrder: [],
  customFeedTabs: [],
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

  setFeedTabsOrder: (order) => {
    setString('feed_tabs_order_pref', JSON.stringify(order));
    set({ feedTabsOrder: order });
  },

  addCustomFeedTab: (tab) => {
    const { customFeedTabs } = get();
    if (customFeedTabs.some(t => t.id === tab.id)) return;
    const newTabs = [...customFeedTabs, tab];
    setString('custom_feed_tabs_pref', JSON.stringify(newTabs));
    set({ customFeedTabs: newTabs });
  },

  removeCustomFeedTab: (id) => {
    const { customFeedTabs, hiddenFeedTabs } = get();
    const newTabs = customFeedTabs.filter(t => t.id !== id);
    const newHidden = hiddenFeedTabs.filter(t => t !== id);
    setString('custom_feed_tabs_pref', JSON.stringify(newTabs));
    setString('hidden_feed_tabs_pref', JSON.stringify(newHidden));
    set({ customFeedTabs: newTabs, hiddenFeedTabs: newHidden });
  },

  hydrate: () => {
    try {
      // Schema version guard: if stored version doesn't match, reset to defaults.
      // Prevents stale TabId/FeedTabId strings from corrupting preferences after app updates.
      const storedVersion = getString('pref_version');
      if (storedVersion !== PREFS_VERSION) {
        setString('pref_version', PREFS_VERSION);
        setString('hidden_tabs_pref', JSON.stringify([]));
        setString('hidden_feed_tabs_pref', JSON.stringify(['walkins']));
        setString('feed_tabs_order_pref', JSON.stringify([]));
        setString('custom_feed_tabs_pref', JSON.stringify([]));
        set({ hiddenTabs: [], hiddenFeedTabs: ['walkins'], feedTabsOrder: [], customFeedTabs: [], hasHydrated: true });
        return;
      }

      const storedTabs = getString('hidden_tabs_pref');
      const parsedTabs = storedTabs ? JSON.parse(storedTabs) : [];

      const storedFeedTabs = getString('hidden_feed_tabs_pref');
      const parsedFeedTabs = storedFeedTabs ? JSON.parse(storedFeedTabs) : ['walkins'];

      const storedOrder = getString('feed_tabs_order_pref');
      const parsedOrder = storedOrder ? JSON.parse(storedOrder) : [];

      const storedCustomTabs = getString('custom_feed_tabs_pref');
      const parsedCustomTabs = storedCustomTabs ? JSON.parse(storedCustomTabs) : [];

      set({
        hiddenTabs: Array.isArray(parsedTabs) ? parsedTabs : [],
        hiddenFeedTabs: Array.isArray(parsedFeedTabs) ? parsedFeedTabs : [],
        feedTabsOrder: Array.isArray(parsedOrder) ? parsedOrder : [],
        customFeedTabs: Array.isArray(parsedCustomTabs) ? parsedCustomTabs : [],
        hasHydrated: true,
      });
    } catch {
      set({ hiddenTabs: [], hiddenFeedTabs: ['walkins'], feedTabsOrder: [], customFeedTabs: [], hasHydrated: true });
    }
  },
}));
