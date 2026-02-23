'use client';

import { useState, useEffect, useCallback } from 'react';
import { alertsApi } from '@/lib/api/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useContext } from 'react';
import toast from 'react-hot-toast';

const CACHE_KEY = 'ff_unread_count_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SEEN_TOAST_ALERTS_KEY = 'ff_seen_toast_alerts';
const ALERTS_UPDATED_EVENT = 'ff-alerts-updated';

function readCache(): { count: number; at: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { count: number; at: number };
        if (Date.now() - parsed.at > CACHE_TTL) return null;
        return parsed;
    } catch { return null; }
}

function writeCache(count: number) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: Date.now() })); } catch { /* empty */ }
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

export function clearUnreadCache() {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(CACHE_KEY); } catch { /* empty */ }
}

export function useUnreadNotifications() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;

    // Initialise from cache synchronously — no flash on navigation
    const [unreadCount, setUnreadCount] = useState<number>(() => readCache()?.count ?? 0);

    const fetchCount = useCallback(async () => {
        if (!user) return;
        try {
            const data = await alertsApi.getUnreadCount() as { count: number };
            setUnreadCount(data.count);
            writeCache(data.count);
        } catch {
            // silent fail — keep stale value
        }
    }, [user]);

    const showNewAlertToasts = useCallback(async () => {
        if (!user) return;
        try {
            const response = await alertsApi.getFeed('all', 10) as {
                deliveries?: Array<{
                    id: string;
                    kind: string;
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
                toast.success(company ? `${title} • ${company}` : title, {
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
        if (!user) return;

        // Only fetch if cache is stale or empty (initial state already took care of the cached value)
        const cached = readCache();
        if (!cached) {
            // Use setTimeout to avoid synchronous setState in effect warning
            setTimeout(() => { void fetchCount(); }, 0);
        }

        // Poll every 5 minutes (deduplicated across tab navigations)
        const interval = setInterval(fetchCount, CACHE_TTL);

        const onFocus = () => {
            void fetchCount();
            void showNewAlertToasts();
        };
        const onVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            onFocus();
        };
        const onAlertsUpdated = () => {
            void fetchCount();
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

    return { unreadCount, refresh: fetchCount };
}
