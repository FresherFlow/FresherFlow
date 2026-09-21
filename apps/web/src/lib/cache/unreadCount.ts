'use client';

/**
 * Unread-alert count cache — the single home for the shared count state.
 *
 * Lives in lib/cache rather than features/notifications so infrastructure such as
 * lib/auth/AuthContext can clear it on logout without a back-edge into features/.
 * The React hook (features/notifications/hooks/useUnreadNotifications) owns the
 * fetching and toasts; this module owns the persisted cache and the shared count.
 */

const CACHE_KEY = 'ff_unread_count_cache';

export const CACHE_TTL = Number(process.env.NEXT_PUBLIC_ALERTS_CACHE_TTL_MS || 15 * 60 * 1000);
export const ALERTS_UPDATED_EVENT = 'ff-alerts-updated';

export type UnreadCache = { count: number; at: number };

/**
 * Shared mutable state read by both the cache helpers and the hook. Kept on one
 * object so the hook and the infrastructure layer cannot drift apart.
 */
export const unreadCountState = {
    count: 0,
    lastSuccessfulFetchAt: 0,
    fetchPromise: null as Promise<number> | null,
};

const sharedListeners = new Set<(count: number) => void>();

export function broadcastUnreadCount(count: number) {
    unreadCountState.count = count;
    sharedListeners.forEach((listener) => listener(count));
}

export function subscribeUnreadCount(listener: (count: number) => void) {
    sharedListeners.add(listener);
    return () => {
        sharedListeners.delete(listener);
    };
}

export function readCache(): UnreadCache | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as UnreadCache;
        if (Date.now() - parsed.at > CACHE_TTL) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function readRawCache(): UnreadCache | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as UnreadCache;
    } catch {
        return null;
    }
}

export function writeCache(count: number) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: Date.now() }));
    } catch {
        // ignore quota issues
    }
}

export function isCacheFresh(at: number) {
    return Date.now() - at < CACHE_TTL;
}

export function clearUnreadCache() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {
        // ignore quota issues
    }
    unreadCountState.lastSuccessfulFetchAt = 0;
    broadcastUnreadCount(0);
}
