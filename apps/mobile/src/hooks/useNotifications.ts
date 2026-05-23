import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';

export function useNotifications() {
    // Select primitives individually — prevents re-render loop from new object references
    const alerts = useNotificationStore(s => s.alerts);
    const unreadCount = useNotificationStore(s => s.unreadCount);
    const unseenFeedCount = useNotificationStore(s => s.unseenFeedCount);
    const loading = useNotificationStore(s => s.loading);
    const refreshing = useNotificationStore(s => s.refreshing);
    const lastFetched = useNotificationStore(s => s.lastFetched);
    const hydrate = useNotificationStore(s => s.hydrate);
    const startPolling = useNotificationStore(s => s.startPolling);
    const stopPolling = useNotificationStore(s => s.stopPolling);
    const fetchAlerts = useNotificationStore(s => s.fetchAlerts);
    const markRead = useNotificationStore(s => s.markRead);
    const markAllRead = useNotificationStore(s => s.markAllRead);
    const deleteAlert = useNotificationStore(s => s.deleteAlert);

    // Initial hydration — only if never fetched
    useEffect(() => {
        if (!lastFetched) {
            void hydrate();
        }
    }, []); // intentionally run once on mount only

    // Start/stop the 30s poll tied to this component's lifecycle
    useEffect(() => {
        startPolling();
        return () => stopPolling();
    }, []); // intentionally run once on mount only

    return {
        alerts,
        unreadCount,
        unseenFeedCount,
        loading,
        refreshing,
        markRead,
        markAllRead,
        deleteAlert,
        refresh: () => fetchAlerts(true),
    };
}
