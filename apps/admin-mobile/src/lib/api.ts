/**
 * Typed domain API functions for admin-mobile.
 * All calls go through `apiRequest` from http.ts — no raw fetch here.
 */
import { apiRequest } from './http';

// ─── Shared types ────────────────────────────────────────────────────────────

import type { Admin, Opportunity, OpportunityListResponse } from '@fresherflow/types';
export type { Admin, Opportunity, OpportunityListResponse };
export type MeResponse = { admin: Admin };

export type LoginOptions = {
    challenge: string;
    [key: string]: unknown;
};

export type LoginVerifyResponse = { verified: boolean; accessToken?: string };

export type TotpGenerateResponse = {
    secret: string;
    /** data: URI of the QR code image */
    qrCode: string;
    /** raw otpauth:// URI for manual entry */
    otpauthUrl?: string;
};

export type MetricsV2 = {
    window: string;
    generatedAt: string;
    listings: {
        live: number;
        published: number;
        drafts: number;
        expired: number;
        new24h: number;
        liveWalkins: number;
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
};

export type AnalyticsOverview = {
    urgent: { closingSoon48h: number; brokenLinks: number };
    [key: string]: unknown;
};

export type RecentActivity = {
    items: {
        id: string;
        action: string;
        entity: string;
        createdAt: string;
        adminEmail?: string;
    }[];
};

export type ConfigHealth = {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
};

export type HealthStats = {
    uptime: number;
    memory: { heapUsed: number; heapTotal: number };
    [key: string]: unknown;
};

export type VerifyLinksStats = {
    total: number;
    healthy: number;
    broken: number;
    retrying: number;
    pending: number;
};

export type AlertsRunResult = { message: string; dispatched?: number };



export type TelegramBroadcast = {
    id: string;
    opportunityId: string | null;
    message: string;
    status: string;
    sentAt?: string | null;
    scheduledAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
    errorMessage?: string | null;
    retryCount: number;
    opportunity?: { title: string; company: string } | null;
};

export type OpportunityListParams = {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    sort?: string;
};

export type FeedbackItem = {
    id: string;
    message: string;
    rating?: number | null;
    createdAt: string;
    userEmail?: string;
};

export type AppFeedbackItem = {
    id: string;
    type: string;
    message: string;
    createdAt: string;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const Auth = {
    me: () => apiRequest<MeResponse>('/api/admin/auth/me'),

    loginOptions: (email: string) =>
        apiRequest<LoginOptions>('/api/admin/auth/login/options', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    loginVerify: (email: string, response: unknown) =>
        apiRequest<LoginVerifyResponse>('/api/admin/auth/login/verify', {
            method: 'POST',
            body: JSON.stringify({ email, response }),
        }),

    loginTotp: (email: string, code: string) =>
        apiRequest<LoginVerifyResponse>('/api/admin/auth/login/totp', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        }),

    logout: () =>
        apiRequest<{ message: string }>('/api/admin/auth/logout', { method: 'POST' }),
};

// ─── TOTP ────────────────────────────────────────────────────────────────────

export const Totp = {
    generate: () =>
        apiRequest<TotpGenerateResponse>('/api/admin/auth/totp/generate', { method: 'POST' }),

    verify: (code: string) =>
        apiRequest<{ verified: boolean }>('/api/admin/auth/totp/verify', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

    disable: () =>
        apiRequest<{ message: string }>('/api/admin/auth/totp/disable', { method: 'POST' }),
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const Analytics = {
    overview: () =>
        apiRequest<AnalyticsOverview>('/api/admin/analytics/overview'),

    recentActivity: () =>
        apiRequest<RecentActivity>('/api/admin/analytics/recent-activity'),
};

// ─── System ───────────────────────────────────────────────────────────────────

export const System = {
    metricsV2: (window: '24h' | '7d' | '30d' = '7d') =>
        apiRequest<MetricsV2>(`/api/admin/system/metrics-v2?window=${window}`),

    configHealth: () =>
        apiRequest<ConfigHealth>('/api/admin/system/config-health'),

    healthStats: () =>
        apiRequest<HealthStats>('/api/admin/system/health-stats'),

    verifyLinksStats: () =>
        apiRequest<VerifyLinksStats>('/api/admin/system/verify-links/stats'),

    verifyLinksRun: () =>
        apiRequest<{ message: string }>('/api/admin/system/verify-links', { method: 'POST' }),

    alertsRun: () =>
        apiRequest<AlertsRunResult>('/api/admin/system/alerts/run', { method: 'POST' }),

    alertsBackfill: () =>
        apiRequest<AlertsRunResult>('/api/admin/system/alerts/backfill', { method: 'POST' }),

    alertsDispatchLogs: () =>
        apiRequest<{ logs: { id: string; status: string; createdAt: string; message?: string }[] }>(
            '/api/admin/system/alerts/dispatch-logs',
        ),

    metricsRefresh: () =>
        apiRequest<{ message: string }>('/api/admin/system/metrics/refresh', { method: 'POST' }),

    growthFunnel: () =>
        apiRequest<unknown>('/api/admin/system/growth-funnel'),

    // ── Convenience aliases used by SystemScreen ──────────────────────────────
    verifyLinks: () =>
        apiRequest<{ checked?: number; broken?: number }>('/api/admin/system/verify-links', { method: 'POST' }),

    runAlerts: () =>
        apiRequest<{ sent?: number }>('/api/admin/system/alerts/run', { method: 'POST' }),

    backfillAlerts: () =>
        apiRequest<{ processed?: number; usersSent?: number }>('/api/admin/system/alerts/backfill-new-jobs', { method: 'POST' }),

    alertDispatchLogs: (limit = 20) =>
        apiRequest<{ logs: { id: string; channel: string; status: string; sentAt: string | null; errorMessage?: string | null }[] }>(
            `/api/admin/system/alerts/dispatch-logs?limit=${limit}`,
        ),
};


// ─── Telegram ────────────────────────────────────────────────────────────────

export const Telegram = {
    broadcasts: (limitOrParams?: number | { page?: number; limit?: number; status?: string }) => {
        let qs = '';
        if (typeof limitOrParams === 'number') {
            qs = `?limit=${limitOrParams}`;
        } else if (limitOrParams) {
            qs = '?' + new URLSearchParams(Object.entries(limitOrParams).map(([k, v]) => [k, String(v)])).toString();
        }
        return apiRequest<{ broadcasts: TelegramBroadcast[]; total: number }>(
            `/api/admin/system/telegram-broadcasts${qs}`,
        );
    },

    retry: (id: string) =>
        apiRequest<{ message: string }>(`/api/admin/system/telegram-broadcasts/${id}/retry`, {
            method: 'POST',
        }),
};

// ─── Opportunities ───────────────────────────────────────────────────────────

export const Opportunities = {
    list: (params: OpportunityListParams = {}) => {
        const qs = new URLSearchParams(
            Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)]),
        ).toString();
        return apiRequest<OpportunityListResponse>(`/api/admin/opportunities${qs ? '?' + qs : ''}`);
    },

    get: (id: string) =>
        apiRequest<{ opportunity: Opportunity }>(`/api/admin/opportunities/${id}`),

    create: (payload: unknown) =>
        apiRequest<{ opportunity: Opportunity }>('/api/admin/opportunities', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    update: (id: string, payload: unknown) =>
        apiRequest<{ opportunity: Opportunity }>(`/api/admin/opportunities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    expire: (id: string, reason?: string) =>
        apiRequest<{ message: string }>(`/api/admin/opportunities/${id}/expire`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    restore: (id: string) =>
        apiRequest<{ message: string }>(`/api/admin/opportunities/${id}/restore`, { method: 'POST' }),

    delete: (id: string, reason?: string) =>
        apiRequest<{ message: string }>(`/api/admin/opportunities/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    parse: (url: string) =>
        apiRequest<{ draft: unknown }>('/api/admin/opportunities/parse', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),

    parseText: (text: string) =>
        apiRequest<{ parsed: unknown }>('/api/admin/opportunities/parse', {
            method: 'POST',
            body: JSON.stringify({ text }),
        }),

    ingestDraft: (payload: unknown) =>
        apiRequest<{ opportunity: Opportunity }>('/api/admin/opportunities/ingest-draft', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    events: (id: string) =>
        apiRequest<{ events: { id: string; type: string; note?: string; createdAt: string }[] }>(
            `/api/admin/opportunities/${id}/events`,
        ),

    addEvent: (id: string, payload: { type: string; note?: string }) =>
        apiRequest<{ event: unknown }>(`/api/admin/opportunities/${id}/events`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    deleteEvent: (oppId: string, eventId: string) =>
        apiRequest<{ message: string }>(`/api/admin/opportunities/${oppId}/events/${eventId}`, {
            method: 'DELETE',
        }),

    export: (params: OpportunityListParams = {}) => {
        const qs = new URLSearchParams(
            Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)]),
        ).toString();
        return apiRequest<Blob>(`/api/admin/opportunities/export${qs ? '?' + qs : ''}`);
    },
};

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const Feedback = {
    list: (params?: { page?: number; limit?: number }) => {
        const qs = params
            ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
            : '';
        return apiRequest<{ feedback: FeedbackItem[]; total: number }>(
            `/api/admin/feedback${qs}`,
        );
    },

    appFeedback: (params?: { page?: number; limit?: number }) => {
        const qs = params
            ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
            : '';
        return apiRequest<{ feedback: AppFeedbackItem[]; total: number }>(
            `/api/admin/app-feedback${qs}`,
        );
    },

    opportunityFeedback: (oppId: string) =>
        apiRequest<{ feedback: FeedbackItem[] }>(`/api/admin/feedback/opportunities/${oppId}`),
};
