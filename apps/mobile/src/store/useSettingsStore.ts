import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';

interface SettingsState {
  openInAppWebView: boolean;
  setOpenInAppWebView: (value: boolean) => void;
}

/**
 * MMKV Storage adapter for Zustand persist
 */
const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openInAppWebView: false, // Default: standard system/in-app browser (safe)
      setOpenInAppWebView: (value) => set({ openInAppWebView: value }),
    }),
    {
      name: 'ff_settings_v1',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
