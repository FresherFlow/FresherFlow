import { ActionType } from '@fresherflow/types';
import { apiClient } from './_core';

const GROWTH_SESSION_KEY = 'ff_growth_session_v1';

function getGrowthSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
        const existing = window.sessionStorage.getItem(GROWTH_SESSION_KEY);
        if (existing && existing.length > 0) return existing;
        const next = `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.sessionStorage.setItem(GROWTH_SESSION_KEY, next);
        return next;
    } catch {
        return 'session-unavailable';
    }
}

export const growthApi = {
    trackEvent: (
        event:
            | 'DETAIL_VIEW'
            | 'LOGIN_VIEW'
            | 'SAVE_JOB'
            | 'APPLY_CLICK'
            | 'SHARE_JOB'
            | 'SIGNUP_VIEW'
            | 'INSTALL_PROMPT_SHOWN'
            | 'INSTALL_ACCEPTED'
            | 'OPENED_STANDALONE',
        source = 'unknown',
        options?: {
            opportunityId?: string;
        }
    ) =>
        apiClient('/api/public/growth/event', {
            method: 'POST',
            body: JSON.stringify({
                event,
                source,
                route: typeof window !== 'undefined' ? window.location.pathname : undefined,
                sessionId: getGrowthSessionId(),
                opportunityId: options?.opportunityId,
            })
        })
};

// Actions API calls
export const actionsApi = {
    list: () => apiClient('/api/actions'),
    summary: () => apiClient('/api/actions/summary'),

    track: (opportunityId: string, actionType: ActionType) =>
        apiClient(`/api/actions/${opportunityId}/action`, {
            method: 'POST',
            body: JSON.stringify({ actionType })
        }),

    remove: (opportunityId: string) =>
        apiClient(`/api/actions/${opportunityId}`, {
            method: 'DELETE'
        })
};

// Feedback API calls
export const feedbackApi = {
    submit: (opportunityId: string, reason: string) =>
        apiClient(`/api/opportunities/${opportunityId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        })
};

export const appFeedbackApi = {
    submit: (data: { type: string; rating?: number; message: string; pageUrl?: string }) =>
        apiClient('/api/feedback', {
            method: 'POST',
            body: JSON.stringify(data)
        })
};

// Saved API calls
export const savedApi = {
    list: () => apiClient('/api/saved'),
    toggle: (opportunityId: string, details?: Record<string, unknown>) =>
        apiClient(`/api/saved/${opportunityId}`, {
            method: 'POST',
            body: details ? JSON.stringify(details) : undefined
        })
};

// Dashboard API calls
export const dashboardApi = {
    getHighlights: () => apiClient('/api/dashboard/highlights')
};

// Alerts API calls
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

export const referralApi = {
    getMe: () => apiClient<unknown>('/api/referrals/me'),
    validateCode: (code: string) => apiClient<{ valid: boolean; referrerId: string }>(`/api/public/referrals/${code}`),
    trackClick: (code: string) => apiClient(`/api/public/referrals/${code}/click`, { method: 'POST' }),
};
