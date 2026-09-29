import { apiClient } from './core';
import { authApi as baseAuthApi } from './auth';
import { appFeedbackApi as baseAppFeedbackApi } from './social';

export * from './core';
export * from './auth';
export * from './profile';
export * from './opportunities';
export * from './social';

// Deprecated no-ops
export const setTokens = (accessToken?: string, refreshToken?: string) => {
    void accessToken;
    void refreshToken;
}; // Deprecated: No-op
export const getTokens = () => ({ accessToken: null, refreshToken: null }); // Deprecated: No-op
export const clearTokens = () => { }; // Deprecated: No-op

type ServerErrorEnvelope = {
    error?: { message?: string } | string;
    message?: string;
};

function readServerMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object') {
        const envelope = payload as ServerErrorEnvelope;
        const nested = envelope.error;
        if (typeof nested === 'string' && nested.trim()) return nested;
        if (nested && typeof nested === 'object' && nested.message) return nested.message;
        if (typeof envelope.message === 'string' && envelope.message.trim()) return envelope.message;
    }
    return fallback;
}

// Session-scoped wrappers. These mirror authApi.logout's transport on purpose:
// same-origin fetch POST so the HttpOnly session cookies flow, no Bearer header.
async function logoutAll(): Promise<void> {
    const res = await fetch('/api/auth/logout/all', { method: 'POST' });
    if (!res.ok) {
        let payload: unknown = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }
        throw new Error(readServerMessage(payload, 'Could not sign out all sessions.'));
    }
}

async function logoutOthers(): Promise<{ revokedCount: number }> {
    const res = await fetch('/api/auth/logout/others', { method: 'POST' });
    let payload: unknown = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }
    if (!res.ok) {
        throw new Error(readServerMessage(payload, 'Could not sign out other sessions.'));
    }
    const count =
        payload && typeof payload === 'object' && 'revokedCount' in payload
            ? (payload as { revokedCount?: unknown }).revokedCount
            : 0;
    return { revokedCount: typeof count === 'number' ? count : 0 };
}

async function deleteAccount(): Promise<void> {
    const res = await fetch('/api/auth/account', { method: 'DELETE' });
    if (!res.ok) {
        let payload: unknown = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }
        throw new Error(readServerMessage(payload, 'Could not delete the account.'));
    }
}

export type AppFeedbackHistoryItem = {
    id: string;
    type: string;
    message: string;
    rating: number | null;
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
    createdAt: string;
};

function listMine(): Promise<{ feedback: AppFeedbackHistoryItem[] }> {
    return apiClient<{ feedback: AppFeedbackHistoryItem[] }>('/api/feedback/mine');
}

// Explicit exports take precedence over the `export *` barrels above, so
// importers of '@/lib/api/client' see the extended objects with types.
export const authApi = {
    ...baseAuthApi,
    logoutAll,
    logoutOthers,
    deleteAccount,
};

export const appFeedbackApi = {
    ...baseAppFeedbackApi,
    listMine,
};
