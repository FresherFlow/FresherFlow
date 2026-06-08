import { create } from 'zustand';
import { 
    getLocalAlerts, 
    getUnseenCount, 
    markLocalAlertAsRead, 
    markAllLocalAlertsAsRead, 
    deleteLocalAlert,
    processNextDripAlertIfNeeded,
    LocalAlert
} from '@/utils/cache/localNotifications';

interface NotificationState {
    alerts: LocalAlert[];
    privateUnreadCount: number;
    govtUnreadCount: number;
    unseenFeedCount: number;
    loading: boolean;
    refreshing: boolean;
    lastFetched: number | null;
    
    // Actions
    fetchAlerts: (isRefresh?: boolean) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: (sector?: 'PRIVATE' | 'GOVERNMENT') => Promise<void>;
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
        
        const postedA = new Date(a.opportunity.postedAt || 0).getTime();
        const postedB = new Date(b.opportunity.postedAt || 0).getTime();
        return postedB - postedA;
    });
};

const getCounts = (alerts: LocalAlert[]) => {
    const unread = alerts.filter(a => !a.readAt);
    return {
        privateUnreadCount: unread.filter(a => a.opportunity.type !== 'GOVERNMENT').length,
        govtUnreadCount: unread.filter(a => a.opportunity.type === 'GOVERNMENT').length,
    };
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
    alerts: [],
    privateUnreadCount: 0,
    govtUnreadCount: 0,
    unseenFeedCount: 0,
    loading: false,
    refreshing: false,
    lastFetched: null,

    fetchAlerts: async (isRefresh = false) => {
        const { alerts: currentAlerts } = get();
        if (isRefresh) set({ refreshing: true });
        else if (currentAlerts.length === 0) set({ loading: true });

        try {
            const alerts = await getLocalAlerts();
            const counts = getCounts(alerts);

            set({
                alerts: sortAlerts(alerts),
                ...counts,
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
            await processNextDripAlertIfNeeded();

            const alerts = await getLocalAlerts();
            const unseenFeed = await getUnseenCount();
            
            set({
                alerts: sortAlerts(alerts),
                ...getCounts(alerts),
                unseenFeedCount: unseenFeed
            });
        } catch (error) {
            console.error('[NotificationStore] fetchUnreadCount failed:', error);
        }
    },

    markRead: async (id: string) => {
        try {
            const currentAlerts = get().alerts;
            const updated = currentAlerts.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a);
            set({ alerts: updated, ...getCounts(updated) });

            await markLocalAlertAsRead(id);
        } catch (error) {
            console.error('[NotificationStore] markRead failed:', error);
        }
    },

    markAllRead: async (sector?: 'PRIVATE' | 'GOVERNMENT') => {
        try {
            const currentAlerts = get().alerts;
            const updated = currentAlerts.map(a => {
                if (!sector || a.opportunity.type === sector || (sector === 'PRIVATE' && a.opportunity.type !== 'GOVERNMENT')) {
                    return { ...a, readAt: a.readAt || new Date().toISOString() };
                }
                return a;
            });
            set({ alerts: updated, ...getCounts(updated) });

            await markAllLocalAlertsAsRead(sector);
        } catch (error) {
            console.error('[NotificationStore] markAllRead failed:', error);
        }
    },

    deleteAlert: async (id: string) => {
        try {
            const currentAlerts = get().alerts;
            const updated = currentAlerts.filter(a => a.id !== id);
            set({ alerts: updated, ...getCounts(updated) });

            await deleteLocalAlert(id);
        } catch (error) {
            console.error('[NotificationStore] deleteAlert failed:', error);
        }
    },

    hydrate: async () => {
        const { alerts: currentAlerts } = get();
        if (currentAlerts.length === 0) set({ loading: true });

        try {
            const alerts = await getLocalAlerts();
            const unseenCount = await getUnseenCount();
            
            set({ 
                alerts: sortAlerts(alerts), 
                ...getCounts(alerts),
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
        stopPolling();
        
        void fetchUnreadCount();
        
        // Poll every 30 seconds for background updates and drip triggers
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
