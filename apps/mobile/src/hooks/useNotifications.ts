import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { alertsApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { AlertDelivery } from '@fresherflow/types';
import { saveAlertsCache, readAlertsCache } from '@/utils/offlineCache';

import { getUnseenCount } from '@/utils/localNotifications';

export interface NotificationState {
    alerts: AlertDelivery[];
    unreadCount: number;
    unseenFeedCount: number;
    loading: boolean;
    refreshing: boolean;
}

export function useNotifications() {
    const [state, setState] = useState<NotificationState>({
        alerts: [],
        unreadCount: 0,
        unseenFeedCount: 0,
        loading: true,
        refreshing: false,
    });

    const { user } = useAuth();

    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAlerts = useCallback(async (isRefresh = false) => {
        if (!user) {
            setState(prev => ({ ...prev, loading: false, refreshing: false }));
            return;
        }

        if (isRefresh) {
            setState(prev => ({ ...prev, refreshing: true }));
        } else {
            setState(prev => ({ ...prev, loading: true }));
        }

        try {
            const data = await alertsApi.getFeed('all', 50);
            const alerts = data.deliveries || [];
            const unreadCount = data.unreadCount || 0;

            setState(prev => ({
                ...prev,
                alerts,
                unreadCount,
                loading: false,
                refreshing: false,
            }));
            void saveAlertsCache(alerts, unreadCount);
        } catch (error) {
            console.error('[useNotifications] fetchAlerts failed:', error);
            setState(prev => ({ ...prev, loading: false, refreshing: false }));
        }
    }, [user]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const [unreadData, unseenFeed] = await Promise.all([
                user ? alertsApi.getUnreadCount() : Promise.resolve({ count: 0 }),
                getUnseenCount()
            ]);

            setState(prev => ({
                ...prev,
                unreadCount: unreadData.count,
                unseenFeedCount: unseenFeed
            }));
        } catch (error) {
            console.error('[useNotifications] fetchUnreadCount failed:', error);
        }
    }, [user]);

    const markRead = useCallback(async (id: string) => {
        if (!user) return;
        try {
            await alertsApi.markRead(id);
            setState(prev => ({
                ...prev,
                alerts: prev.alerts.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a),
                unreadCount: Math.max(0, prev.unreadCount - 1),
            }));
        } catch (error) {
            console.error('[useNotifications] markRead failed:', error);
        }
    }, [user]);

    const markAllRead = useCallback(async () => {
        if (!user) return;
        try {
            await alertsApi.markAllRead();
            setState(prev => ({
                ...prev,
                alerts: prev.alerts.map(a => ({ ...a, readAt: new Date().toISOString() })),
                unreadCount: 0,
            }));
        } catch (error) {
            console.error('[useNotifications] markAllRead failed:', error);
        }
    }, [user]);

    const deleteAlert = useCallback(async (id: string) => {
        if (!user) return;
        try {
            const alertToDelete = state.alerts.find(a => a.id === id);
            await alertsApi.dismiss(id);
            setState(prev => ({
                ...prev,
                alerts: prev.alerts.filter(a => a.id !== id),
                unreadCount: alertToDelete && !alertToDelete.readAt ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
            }));
        } catch (error) {
            console.error('[useNotifications] deleteAlert failed:', error);
        }
    }, [user, state.alerts]);

    const startPolling = useCallback(() => {
        if (!user) return;
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(fetchUnreadCount, 60000); // Poll every 60s
    }, [user, fetchUnreadCount]);

    const stopPolling = useCallback(() => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        const loadCache = async () => {
            const cached = await readAlertsCache();
            if (cached && cached.items.length > 0) {
                setState(prev => ({
                    ...prev,
                    alerts: cached.items as AlertDelivery[],
                    unreadCount: cached.unreadCount,
                    loading: false
                }));
            }
            if (user) void fetchAlerts();
            else setState(prev => ({ ...prev, alerts: [], unreadCount: 0, loading: false }));
        };

        loadCache();
        return () => stopPolling();
    }, [user, fetchAlerts, stopPolling]);

    // Handle polling when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (user) {
                void fetchUnreadCount();
                startPolling();
            }
            return () => stopPolling();
        }, [user, fetchUnreadCount, startPolling, stopPolling])
    );

    return {
        ...state,
        markRead,
        markAllRead,
        deleteAlert,
        refresh: () => fetchAlerts(true),
    };
}
