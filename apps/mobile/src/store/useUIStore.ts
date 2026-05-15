import { create } from 'zustand';
import { Opportunity } from '@fresherflow/types';

interface ActionSheetState {
  isOpen: boolean;
  opportunity: Opportunity | null;
  open: (opportunity: Opportunity) => void;
  close: () => void;
}

interface UIState {
  actionSheet: ActionSheetState;
}

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
}));
