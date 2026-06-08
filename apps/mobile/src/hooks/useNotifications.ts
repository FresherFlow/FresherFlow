import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSectorStore } from '@/store/useSectorStore';

export function useNotifications() {
    const { sector } = useSectorStore();

    // Select primitives individually — prevents re-render loop from new object references
    const alerts = useNotificationStore(s => s.alerts);
    const privateUnreadCount = useNotificationStore(s => s.privateUnreadCount);
    const govtUnreadCount = useNotificationStore(s => s.govtUnreadCount);
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

    const unreadCount = sector === 'GOVERNMENT' ? govtUnreadCount : privateUnreadCount;

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
        markAllRead: () => markAllRead(sector || 'PRIVATE'),
        deleteAlert,
        refresh: () => fetchAlerts(true),
    };
}
