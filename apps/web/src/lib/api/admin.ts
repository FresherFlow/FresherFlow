import { apiClient } from './client';

// Admin API methods using the centralized client (cookie-based auth)
export const adminApi = {
    // Analytics overview
    getAnalyticsOverview: () =>
        apiClient('/api/admin/analytics/overview'),

    // System health stats
    getHealthStats: () =>
        apiClient('/api/admin/system/health-stats'),

    // Summary stats
    getOpportunitiesSummary: () =>
        apiClient('/api/admin/opportunities/summary'),

    // Create new opportunity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createOpportunity: (data: any) =>
        apiClient('/api/admin/opportunities', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // Get all opportunities (with filters)
    getOpportunities: (filters?: { type?: string; status?: string; linkHealth?: 'HEALTHY' | 'RETRYING' | 'BROKEN'; activeOnly?: boolean; limit?: number; offset?: number; q?: string; sort?: string }) => {
        const query = new URLSearchParams();
        if (filters?.type) query.append('type', filters.type);
        if (filters?.status) query.append('status', filters.status);
        if (filters?.linkHealth) query.append('linkHealth', filters.linkHealth);
        if (filters?.activeOnly) query.append('activeOnly', 'true');
        if (filters?.limit !== undefined) query.append('limit', String(filters.limit));
        if (filters?.offset !== undefined) query.append('offset', String(filters.offset));
        if (filters?.q) query.append('q', filters.q);
        if (filters?.sort) query.append('sort', filters.sort);

        const queryString = query.toString();
        return apiClient(`/api/admin/opportunities${queryString ? `?${queryString}` : ''}`);
    },

    // Get single opportunity
    getOpportunity: (id: string) =>
        apiClient(`/api/admin/opportunities/${id}`),

    getOpportunityEvents: (id: string) =>
        apiClient(`/api/admin/opportunities/${id}/events`),

    createOpportunityEvent: (id: string, data: { eventType: string; eventDate: string; title: string; notes?: string; sourceLink?: string }) =>
        apiClient(`/api/admin/opportunities/${id}/events`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    updateOpportunityEvent: (id: string, eventId: string, data: Partial<{ eventType: string; eventDate: string; title: string; notes?: string; sourceLink?: string }>) =>
        apiClient(`/api/admin/opportunities/${id}/events/${eventId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    deleteOpportunityEvent: (id: string, eventId: string) =>
        apiClient(`/api/admin/opportunities/${id}/events/${eventId}`, {
            method: 'DELETE'
        }),

    // Update opportunity (full edit form)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateOpportunity: (id: string, data: any) =>
        apiClient(`/api/admin/opportunities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    // Lightweight status-only update (quick Publish / Expire from table)
    updateOpportunityStatus: (id: string, status: string) =>
        apiClient(`/api/admin/opportunities/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        }),

    // Expire opportunity
    expireOpportunity: (id: string) =>
        apiClient(`/api/admin/opportunities/${id}/expire`, {
            method: 'POST'
        }),

    // Delete opportunity (soft delete with reason)
    deleteOpportunity: (id: string, reason?: string) =>
        apiClient(`/api/admin/opportunities/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Deleted by admin' })
        }),

    restoreOpportunity: (id: string) =>
        apiClient(`/api/admin/opportunities/${id}/restore`, {
            method: 'POST'
        }),

    // Reject a draft — sets deletionReason so contributor sees it in "My Shares"
    rejectOpportunity: (id: string, reason: string) =>
        apiClient(`/api/admin/opportunities/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        }),

    // Get all feedback
    getFeedback: () =>
        apiClient('/api/admin/feedback'),

    // Feedback/report alerts count since timestamp (ISO)
    getFeedbackAlerts: (since?: string) => {
        const query = new URLSearchParams();
        if (since) query.set('since', since);
        const queryString = query.toString();
        return apiClient(`/api/admin/feedback/alerts${queryString ? `?${queryString}` : ''}`);
    },

    // Get app feedback
    getAppFeedback: () =>
        apiClient('/api/admin/app-feedback'),

    // System observability metrics
    getSystemMetrics: () =>
        apiClient('/api/admin/system/metrics'),

    // Canonical dashboard metrics
    getSystemMetricsV2: (window: '24h' | '7d' | '30d' = '30d') =>
        apiClient(`/api/admin/system/metrics-v2?window=${window}`),

    refreshSystemMetricsV2: (window: '24h' | '7d' | '30d' = '30d') =>
        apiClient(`/api/admin/system/metrics-v2/refresh?window=${window}`, {
            method: 'POST'
        }),

    getDeliveryControls: () =>
        apiClient('/api/admin/system/delivery-controls'),

    updateDeliveryControls: (data: {
        socialAutoPostingEnabled?: boolean;
        userAlertsEnabled?: boolean;
        userEmailNotificationsEnabled?: boolean;
    }) =>
        apiClient('/api/admin/system/delivery-controls', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    // Alert dispatch observability
    getAlertDispatchLogs: (filters?: {
        status?: 'INITIATED' | 'SENT' | 'FAILED' | 'SKIPPED';
        kind?: 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';
        channel?: 'EMAIL' | 'APP' | 'PUSH';
        reason?: 'DEDUPE_HIT' | 'DAILY_CAP' | 'PREFERENCE_DISABLED' | 'NOT_ELIGIBLE' | 'CHANNEL_ERROR' | 'ENUM_FALLBACK' | 'VALIDATION_ERROR' | 'SENT_OK';
        correlationId?: string;
        sinceHours?: number;
        limit?: number;
    }) => {
        const query = new URLSearchParams();
        if (filters?.status) query.append('status', filters.status);
        if (filters?.kind) query.append('kind', filters.kind);
        if (filters?.channel) query.append('channel', filters.channel);
        if (filters?.reason) query.append('reason', filters.reason);
        if (filters?.correlationId) query.append('correlationId', filters.correlationId);
        if (typeof filters?.sinceHours === 'number') query.append('sinceHours', String(filters.sinceHours));
        if (typeof filters?.limit === 'number') query.append('limit', String(filters.limit));
        const queryString = query.toString();
        return apiClient(`/api/admin/system/alerts/dispatch-logs${queryString ? `?${queryString}` : ''}`);
    },

    // Growth funnel metrics
    getGrowthFunnelMetrics: (window: '24h' | '7d' | '30d' | 'all' = '30d') =>
        apiClient(`/api/admin/system/growth-funnel?window=${window}`),

    // Telegram broadcast logs
    getTelegramBroadcasts: (
        status?: 'SENT' | 'FAILED' | 'SKIPPED',
        limit = 50,
        window: '24h' | '7d' | '30d' | 'all' = 'all'
    ) => {
        const query = new URLSearchParams();
        if (status) query.append('status', status);
        query.append('limit', String(limit));
        query.append('window', window);
        const queryString = query.toString();
        return apiClient(`/api/admin/system/telegram-broadcasts${queryString ? `?${queryString}` : ''}`);
    },

    // Retry a Telegram broadcast by log id
    retryTelegramBroadcast: (id: string) =>
        apiClient(`/api/admin/system/telegram-broadcasts/${id}/retry`, {
            method: 'POST'
        }),

    // Social Posts (X, LinkedIn, Facebook)
    getSocialPosts: (filters?: { platform?: string; status?: string; page?: number }) => {
        const query = new URLSearchParams();
        if (filters?.platform) query.append('platform', filters.platform);
        if (filters?.status) query.append('status', filters.status);
        if (filters?.page !== undefined) query.append('page', String(filters.page));
        const queryString = query.toString();
        return apiClient(`/api/admin/social-posts${queryString ? `?${queryString}` : ''}`);
    },

    retrySocialPost: (id: string) =>
        apiClient(`/api/admin/social-posts/${id}/retry`, {
            method: 'POST'
        }),

    // Parse job description text
    parseJobText: (text: string) =>
        apiClient('/api/admin/opportunities/parse', {
            method: 'POST',
            body: JSON.stringify({ text })
        }),

    bulkAction: (ids: string[], action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE', reason?: string) =>
        apiClient('/api/admin/opportunities/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids, action, reason })
        }),

};
