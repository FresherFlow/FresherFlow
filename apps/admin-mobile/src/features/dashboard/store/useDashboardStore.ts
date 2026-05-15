import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import type { MetricsV2, RecentActivity } from '@fresherflow/api-client';

// Safely initialize MMKV only on native platforms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any = null;
if (Platform.OS !== 'web') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { MMKV } = require('react-native-mmkv');
        storage = new MMKV({ id: 'dashboard-storage' });
    } catch (e) {
        console.warn('Failed to initialize MMKV for dashboard', e);
    }
}

const universalStorage = {
    getItem: (name: string) => {
        if (Platform.OS === 'web') {
            try {
                return window.localStorage.getItem(name);
            } catch {
                return null;
            }
        }
        return storage?.getString(name) ?? null;
    },
    setItem: (name: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                window.localStorage.setItem(name, value);
            } catch {
                // ignore
            }
        } else {
            storage?.set(name, value);
        }
    },
    removeItem: (name: string) => {
        if (Platform.OS === 'web') {
            try {
                window.localStorage.removeItem(name);
            } catch {
                // ignore
            }
        } else {
            storage?.delete(name);
        }
    },
};

interface DashboardState {
    metrics: MetricsV2 | null;
    recentActivity: RecentActivity['items'];
    lastUpdated: number | null;
    setDashboardData: (metrics: MetricsV2, activity: RecentActivity['items']) => void;
    clearCache: () => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            metrics: null,
            recentActivity: [],
            lastUpdated: null,
            setDashboardData: (metrics, activity) => set({ 
                metrics, 
                recentActivity: activity, 
                lastUpdated: Date.now() 
            }),
            clearCache: () => set({ metrics: null, recentActivity: [], lastUpdated: null }),
        }),
        {
            name: 'dashboard-metrics',
            storage: createJSONStorage(() => universalStorage),
        }
    )
);
