import { apiClient } from './apiClient';

export interface MetricsV2 {
    window: string;
    generatedAt: string;
    listings: {
        live: number;
        published: number;
        drafts: number;
        expired: number;
        new24h: number;
        liveWalkins: number;
        pendingSubmissions: number;
    };
    traffic: {
        applications30d: number;
        newUsers30d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        notifiedUsers14d: number;
    };
    funnel: {
        applyClick: number;
        detailView: number;
        authSuccess: number;
    };
    linkHealth?: {
        healthy: number;
        broken: number;
        retrying: number;
    };
    recentListings?: {
        id: string;
        title: string;
        company: string;
        type: string;
        postedAt: string;
    }[];
}

export interface ConfigHealth {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
}

export interface HealthStats {
    uptime: number;
    memory: { heapUsed: number; heapTotal: number };
}

export interface VerifyLinksStats {
    total: number;
    healthy: number;
    broken: number;
    retrying: number;
    pending: number;
}

export const adminSystemApi = {
    metricsV2: (window: '24h' | '7d' | '14d' | '30d' = '7d') =>
        apiClient<MetricsV2>(`/api/admin/system/metrics-v2?window=${window}`),

    configHealth: () =>
        apiClient<ConfigHealth>('/api/admin/system/config-health'),

    health: () =>
        apiClient<HealthStats>('/api/admin/system/health'),

    verifyLinks: () =>
        apiClient<{ checked?: number; broken?: number }>('/api/admin/system/verify-links', { method: 'POST' }),

    runAlerts: () =>
        apiClient<{ sent?: number }>('/api/admin/system/alerts/run', { method: 'POST' }),

    backfillAlerts: () =>
        apiClient<{ processed?: number; usersSent?: number }>('/api/admin/system/alerts/backfill-new-jobs', { method: 'POST' }),

    metricsRefresh: () =>
        apiClient<{ message: string }>('/api/admin/system/metrics/refresh', { method: 'POST' }),

    alertDispatchLogs: (limit: number = 20) =>
        apiClient<{ logs: unknown[] }>(`/api/admin/system/alerts/dispatch-logs?limit=${limit}`),

    verifyLinksStats: () =>
        apiClient<VerifyLinksStats>('/api/admin/system/verify-links/stats'),
};
