import { create } from 'zustand';
import { Opportunity, OpportunityType, WorkMode } from '@fresherflow/types';

interface ActionSheetState {
  isOpen: boolean;
  opportunity: Opportunity | null;
  open: (opportunity: Opportunity) => void;
  close: () => void;
}

export interface PersistedExploreFilters {
  types: OpportunityType[];
  workModes: WorkMode[];
  batchYears: number[];
  tag: string | null;
  sort: 'recommended' | 'latest' | 'trending' | 'closing_soon';
}

interface UIState {
  actionSheet: ActionSheetState;
  exploreFilters: PersistedExploreFilters;
  usernameNudgeDismissed: boolean;
  setUsernameNudgeDismissed: (dismissed: boolean) => void;
  setExploreFilters: (filters: Partial<PersistedExploreFilters>) => void;
  resetExploreFilters: () => void;
}

const initialFilters: PersistedExploreFilters = {
  types: [],
  workModes: [],
  batchYears: [],
  tag: null,
  sort: 'recommended',
};

export const useUIStore = create<UIState>((set) => ({
  actionSheet: {
    isOpen: false,
    opportunity: null,
    open: (opportunity) => set((state) => ({ 
      actionSheet: { ...state.actionSheet, isOpen: true, opportunity } 
    })),
    close: () => set((state) => ({ 
      actionSheet: { ...state.actionSheet, isOpen: false, opportunity: null } 
    })),
  },
  exploreFilters: initialFilters,
  usernameNudgeDismissed: false,
  setUsernameNudgeDismissed: (dismissed) => set({ usernameNudgeDismissed: dismissed }),
  setExploreFilters: (newFilters) => set((state) => ({
    exploreFilters: { ...state.exploreFilters, ...newFilters }
  })),
  resetExploreFilters: () => set({ exploreFilters: initialFilters }),
}));
