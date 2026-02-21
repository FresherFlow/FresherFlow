'use client';

import { useState, useEffect, useCallback } from 'react';
import { alertsApi } from '@/lib/api/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useContext } from 'react';

const CACHE_KEY = 'ff_unread_count_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        return () => clearInterval(interval);
    }, [user, fetchCount]);

    return { unreadCount, refresh: fetchCount };
}
