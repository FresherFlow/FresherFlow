import { create } from 'zustand';
import { 
    getLocalAlerts, 
    getUnseenCount, 
    markLocalAlertAsRead, 
    markAllLocalAlertsAsRead, 
    deleteLocalAlert,
    LocalAlert
} from '@/utils/localNotifications';

interface NotificationState {
    alerts: LocalAlert[];
    unreadCount: number;
    unseenFeedCount: number;
    loading: boolean;
    refreshing: boolean;
    lastFetched: number | null;
    
    // Actions
    fetchAlerts: (isRefresh?: boolean) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteAlert: (id: string) => Promise<void>;
    hydrate: () => Promise<void>;
    startPolling: (userId?: string) => void;
    stopPolling: () => void;
    _pollInterval?: NodeJS.Timeout | null;
}

const sortAlerts = (alerts: LocalAlert[]) => {
    return [...alerts].sort((a, b) => {
        const timeA = new Date(a.sentAt).getTime();
        const timeB = new Date(b.sentAt).getTime();
        if (timeA !== timeB) return timeB - timeA;
        
        // Tie-breaker: postedAt
        const postedA = new Date(a.opportunity.postedAt || 0).getTime();
        const postedB = new Date(b.opportunity.postedAt || 0).getTime();
        return postedB - postedA;
    });
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
    alerts: [],
    unreadCount: 0,
    unseenFeedCount: 0,
    loading: false,
    refreshing: false,
    lastFetched: null,

    fetchAlerts: async (isRefresh = false) => {
        const { alerts } = get();
        if (isRefresh) set({ refreshing: true });
        else if (alerts.length === 0) set({ loading: true });

        try {
            const alerts = await getLocalAlerts();
            // In local-first, unreadCount is calculated from local alerts
            const unreadCount = alerts.filter(a => !a.readAt).length;

            set({
                alerts: sortAlerts(alerts),
                unreadCount,
                loading: false,
                refreshing: false,
                lastFetched: Date.now()
            });
        } catch (error) {
            console.error('[NotificationStore] fetchAlerts failed:', error);
            set({ loading: false, refreshing: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const [alerts, unseenFeed] = await Promise.all([
                getLocalAlerts(),
                getUnseenCount()
            ]);
            
            set({
                alerts: sortAlerts(alerts),
                unreadCount: alerts.filter(a => !a.readAt).length,
                unseenFeedCount: unseenFeed
            });
        } catch (error) {
            console.error('[NotificationStore] fetchUnreadCount failed:', error);
        }
    },

    markRead: async (id: string) => {
        try {
            await markLocalAlertAsRead(id);
            const { alerts } = get();
            const updated = alerts.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a);
            const unreadCount = updated.filter(a => !a.readAt).length;
            
            set({ alerts: updated, unreadCount });
        } catch (error) {
            console.error('[NotificationStore] markRead failed:', error);
        }
    },

    markAllRead: async () => {
        try {
            await markAllLocalAlertsAsRead();
            const { alerts } = get();
            const updated = alerts.map(a => ({ ...a, readAt: new Date().toISOString() }));
            
            set({ alerts: updated, unreadCount: 0 });
        } catch (error) {
            console.error('[NotificationStore] markAllRead failed:', error);
        }
    },

    deleteAlert: async (id: string) => {
        try {
            await deleteLocalAlert(id);
            const { alerts } = get();
            const updated = alerts.filter(a => a.id !== id);
            const unreadCount = updated.filter(a => !a.readAt).length;
            
            set({ alerts: updated, unreadCount });
        } catch (error) {
            console.error('[NotificationStore] deleteAlert failed:', error);
        }
    },

    hydrate: async () => {
        // Only set loading if we don't have any alerts yet to avoid "blink"
        const { alerts: currentAlerts } = get();
        if (currentAlerts.length === 0) set({ loading: true });

        try {
            const [alerts, unseenCount] = await Promise.all([
                getLocalAlerts(),
                getUnseenCount()
            ]);
            
            set({ 
                alerts: sortAlerts(alerts), 
                unreadCount: alerts.filter(a => !a.readAt).length,
                unseenFeedCount: unseenCount,
                lastFetched: Date.now(),
                loading: false
            });
        } catch (error) {
            console.error('[NotificationStore] hydrate failed:', error);
            set({ loading: false });
        }
    },

    startPolling: () => {
        const { stopPolling, fetchUnreadCount } = get();
        // Clear any existing interval
        stopPolling();
        
        // Initial fetch
        void fetchUnreadCount();
        
        // Poll every 30 seconds for background updates
        const interval = setInterval(() => {
            void fetchUnreadCount();
        }, 30000);
        
        set({ _pollInterval: interval });
    },

    stopPolling: () => {
        const { _pollInterval } = get();
        if (_pollInterval) {
            clearInterval(_pollInterval);
            set({ _pollInterval: null });
        }
    }
}));
