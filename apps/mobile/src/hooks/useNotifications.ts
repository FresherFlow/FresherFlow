import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';

export function useNotifications() {
    const store = useNotificationStore();

    // Initial hydration and fetch from local store
    useEffect(() => {
        const init = async () => {
            if (!store.lastFetched) {
                await store.hydrate();
            }
        };
        init();
    }, [store.lastFetched, store.hydrate]);

    // Handle initial unread count fetch
    useEffect(() => {
        store.startPolling();
        return () => store.stopPolling();
    }, [store.startPolling, store.stopPolling]);

    return {
        alerts: store.alerts,
        unreadCount: store.unreadCount,
        unseenFeedCount: store.unseenFeedCount,
        loading: store.loading,
        refreshing: store.refreshing,
        markRead: store.markRead,
        markAllRead: store.markAllRead,
        deleteAlert: store.deleteAlert,
        refresh: () => store.fetchAlerts(true),
    };
}
