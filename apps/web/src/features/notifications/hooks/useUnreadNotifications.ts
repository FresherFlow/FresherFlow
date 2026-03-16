'use client';

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { alertsApi } from '@/lib/api/client';
import { AuthContext } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const CACHE_KEY = 'ff_unread_count_cache';
const CACHE_TTL = Number(process.env.NEXT_PUBLIC_ALERTS_CACHE_TTL_MS || 15 * 60 * 1000);
const SEEN_TOAST_ALERTS_KEY = 'ff_seen_toast_alerts';
const ALERTS_UPDATED_EVENT = 'ff-alerts-updated';
const FOCUS_REFRESH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_ALERTS_FOCUS_COOLDOWN_MS || 120000);
const sharedListeners = new Set<(count: number) => void>();
let sharedUnreadCount = 0;
let sharedLastSuccessfulFetchAt = 0;
let sharedFetchPromise: Promise<number> | null = null;

function isLogoutInProgress() {
    if (typeof window === 'undefined') return false;
    return Boolean((window as Window & { __isLoggingOut?: boolean }).__isLoggingOut);
}

function hasActiveSessionCookie() {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes('ff_logged_in=true');
}

function readCache(): { count: number; at: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { count: number; at: number };
        if (Date.now() - parsed.at > CACHE_TTL) return null;
        return parsed;
    } catch {
        return null;
    }
}

function readRawCache(): { count: number; at: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as { count: number; at: number };
    } catch {
        return null;
    }
}

function writeCache(count: number) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: Date.now() }));
    } catch {
        // ignore quota issues
    }
}

function isCacheFresh(at: number) {
    return Date.now() - at < CACHE_TTL;
}

function readSeenIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = sessionStorage.getItem(SEEN_TOAST_ALERTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as string[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeSeenIds(ids: string[]) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(SEEN_TOAST_ALERTS_KEY, JSON.stringify(ids.slice(-50)));
    } catch {
        // ignore quota issues
    }
}

function broadcastUnreadCount(count: number) {
    sharedUnreadCount = count;
    sharedListeners.forEach((listener) => listener(count));
}

function subscribeUnreadCount(listener: (count: number) => void) {
    sharedListeners.add(listener);
    return () => {
        sharedListeners.delete(listener);
    };
}

export function clearUnreadCache() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {
        // ignore quota issues
    }
    sharedLastSuccessfulFetchAt = 0;
    broadcastUnreadCount(0);
}

export function useUnreadNotifications() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;

    const [unreadCount, setUnreadCount] = useState<number>(() => {
        const cached = readCache();
        const initialCount = cached?.count ?? sharedUnreadCount;
        if (cached) {
            sharedUnreadCount = cached.count;
            sharedLastSuccessfulFetchAt = cached.at;
        }
        return initialCount;
    });
    const lastFocusRefreshAtRef = useRef(0);
    const focusRefreshInFlightRef = useRef(false);
    const lastSuccessfulFetchAtRef = useRef(readRawCache()?.at ?? sharedLastSuccessfulFetchAt);

    const fetchCount = useCallback(async (options?: { force?: boolean }) => {
        if (!user || isLogoutInProgress() || !hasActiveSessionCookie()) {
            broadcastUnreadCount(0);
            return;
        }
        const force = options?.force === true;
        const freshestFetchAt = Math.max(lastSuccessfulFetchAtRef.current, sharedLastSuccessfulFetchAt);
        if (!force && isCacheFresh(freshestFetchAt)) {
            const cached = readCache();
            if (cached) {
                lastSuccessfulFetchAtRef.current = cached.at;
                sharedLastSuccessfulFetchAt = cached.at;
                broadcastUnreadCount(cached.count);
                return;
            }
        }

        try {
            if (!force && sharedFetchPromise) {
                await sharedFetchPromise;
                return;
            }
            sharedFetchPromise = (async () => {
                const data = await alertsApi.getUnreadCount() as { count: number };
                return data.count;
            })();
            const count = await sharedFetchPromise;
            if (isLogoutInProgress() || !hasActiveSessionCookie()) {
                broadcastUnreadCount(0);
                return;
            }
            writeCache(count);
            lastSuccessfulFetchAtRef.current = Date.now();
            sharedLastSuccessfulFetchAt = lastSuccessfulFetchAtRef.current;
            broadcastUnreadCount(count);
        } catch {
            // silent fail, keep stale value
        } finally {
            sharedFetchPromise = null;
        }
    }, [user]);

    const showNewAlertToasts = useCallback(async () => {
        if (!user || isLogoutInProgress() || !hasActiveSessionCookie()) return;
        try {
            const response = await alertsApi.getFeed('all', 10) as {
                deliveries?: Array<{
                    id: string;
                    readAt: string | null;
                    opportunity?: { title?: string; company?: string } | null;
                }>;
            };
            const deliveries = response.deliveries || [];
            const seen = new Set(readSeenIds());
            const unseenUnread = deliveries.filter((item) => !item.readAt && !seen.has(item.id));
            if (unseenUnread.length === 0) return;

            unseenUnread.slice(0, 2).forEach((item) => {
                const title = item.opportunity?.title || 'New alert';
                const company = item.opportunity?.company;
                toast.success(company ? `${title} - ${company}` : title, {
                    id: `alert-${item.id}`,
                    duration: 4500,
                });
            });

            unseenUnread.forEach((item) => seen.add(item.id));
            writeSeenIds(Array.from(seen));
        } catch {
            // silent fail
        }
    }, [user]);

    useEffect(() => {
        return subscribeUnreadCount(setUnreadCount);
    }, []);

    useEffect(() => {
        if (!user || isLogoutInProgress() || !hasActiveSessionCookie()) {
            broadcastUnreadCount(0);
            return;
        }

        const cached = readCache();
        if (cached) {
            broadcastUnreadCount(cached.count);
            lastSuccessfulFetchAtRef.current = cached.at;
            sharedLastSuccessfulFetchAt = cached.at;
        } else {
            setTimeout(() => {
                void fetchCount({ force: true });
            }, 0);
        }

        const interval = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            void fetchCount({ force: true });
        }, CACHE_TTL);

        const maybeRunFocusRefresh = async () => {
            const now = Date.now();
            if (now - lastFocusRefreshAtRef.current < FOCUS_REFRESH_COOLDOWN_MS) return;
            if (now - lastSuccessfulFetchAtRef.current < CACHE_TTL) return;
            if (focusRefreshInFlightRef.current) return;
            focusRefreshInFlightRef.current = true;

            try {
                await fetchCount({ force: true });
                if (window.location.pathname.startsWith('/alerts')) {
                    await showNewAlertToasts();
                }
                lastFocusRefreshAtRef.current = now;
            } finally {
                focusRefreshInFlightRef.current = false;
            }
        };

        const onFocus = () => {
            void maybeRunFocusRefresh();
        };
        const onVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            void maybeRunFocusRefresh();
        };
        const onAlertsUpdated = () => {
            if (isLogoutInProgress() || !hasActiveSessionCookie()) {
                broadcastUnreadCount(0);
                return;
            }
            void fetchCount({ force: true });
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener(ALERTS_UPDATED_EVENT, onAlertsUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener(ALERTS_UPDATED_EVENT, onAlertsUpdated);
        };
    }, [user, fetchCount, showNewAlertToasts]);

    return { unreadCount, refresh: () => fetchCount({ force: true }) };
}
