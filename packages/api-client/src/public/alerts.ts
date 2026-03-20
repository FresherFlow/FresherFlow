import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const alertsApi = {
    getPreferences: () => apiClient('/api/alerts/preferences'),
    getFeed: (kind: 'all' | 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER' = 'all', limit = 50) => {
        const query = new URLSearchParams();
        query.set('kind', kind);
        query.set('limit', String(limit));
        return apiClient(`/api/alerts/feed?${query.toString()}`);
    },
    updatePreferences: (data: {
        enabled?: boolean;
        emailEnabled?: boolean;
        dailyDigest?: boolean;
        closingSoon?: boolean;
        minRelevanceScore?: number;
        preferredHour?: number;
        timezone?: string;
    }) =>
        apiClient('/api/alerts/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
    getUnreadCount: () => apiClient<{ count: number }>('/api/alerts/unread-count'),
    markAllRead: () => apiClient('/api/alerts/mark-all-read', { method: 'POST' }),
    markRead: (id: string) => apiClient(`/api/alerts/${id}/read`, { method: 'POST' }),
    dismiss: (id: string) => apiClient(`/api/alerts/${id}`, { method: 'DELETE' }),
    getDigestItems: (id: string) => apiClient<{
        items: Array<{
            id: string;
            slug: string;
            title: string;
            company: string;
            type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
            locations: string[];
            applyLink?: string | null;
            companyWebsite?: string | null;
            expiresAt?: string | null;
            isSaved?: boolean;
        }>;
        requestedCount: number;
        activeCount: number;
    }>(`/api/alerts/${id}/digest-items`),
    subscribePush: (subscription: PushSubscriptionJSON) =>
        apiClient('/api/alerts/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription })
        }),
    unsubscribePush: () =>
        apiClient('/api/alerts/push/unsubscribe', {
            method: 'DELETE'
        }),
    seedTest: () => apiClient('/api/alerts/seed-test', { method: 'POST' }),
};
