'use client';

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { alertsApi } from '@/lib/api/client';
import { apiClient } from '@/lib/api/core';
import { AuthContext } from '@/lib/auth/AuthContext';
import type { CommunityNotification } from '@fresherflow/types';
import {
    ALERTS_UPDATED_EVENT,
    CACHE_TTL,
    broadcastUnreadCount,
    isCacheFresh,
    readCache,
    readRawCache,
    subscribeUnreadCount,
    unreadCountState,
    writeCache,
} from '@/lib/cache/unreadCount';
import toast from 'react-hot-toast';

const SEEN_TOAST_ALERTS_KEY = 'ff_seen_toast_alerts';
const FOCUS_REFRESH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_ALERTS_FOCUS_COOLDOWN_MS || 120000);

/* `GET /api/notifications` has no unread-count route, so unread notifications
   are counted from a bounded unread-only page. Past this cap the badge
   undercounts; the notifications page itself stays exact. */
const UNREAD_NOTIFICATION_CAP = 50;

function isLogoutInProgress() {
    if (typeof window === 'undefined') return false;
    return Boolean((window as Window & { __isLoggingOut?: boolean }).__isLoggingOut);
}

function hasActiveSessionCookie() {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes('ff_logged_in=true');
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

export function useUnreadNotifications() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;

    const [unreadCount, setUnreadCount] = useState<number>(() => {
        const cached = readCache();
        const initialCount = cached?.count ?? unreadCountState.count;
        if (cached) {
            unreadCountState.count = cached.count;
            unreadCountState.lastSuccessfulFetchAt = cached.at;
        }
        return initialCount;
    });
    const lastFocusRefreshAtRef = useRef(0);
    const focusRefreshInFlightRef = useRef(false);
    const lastSuccessfulFetchAtRef = useRef(readRawCache()?.at ?? unreadCountState.lastSuccessfulFetchAt);

    const fetchCount = useCallback(async (options?: { force?: boolean }) => {
        if (!user || isLogoutInProgress() || !hasActiveSessionCookie()) {
            broadcastUnreadCount(0);
            return;
        }
        const force = options?.force === true;
        const freshestFetchAt = Math.max(lastSuccessfulFetchAtRef.current, unreadCountState.lastSuccessfulFetchAt);
        if (!force && isCacheFresh(freshestFetchAt)) {
            const cached = readCache();
            if (cached) {
                lastSuccessfulFetchAtRef.current = cached.at;
                unreadCountState.lastSuccessfulFetchAt = cached.at;
                broadcastUnreadCount(cached.count);
                return;
            }
        }

        try {
            if (!force && unreadCountState.fetchPromise) {
                await unreadCountState.fetchPromise;
                return;
            }
            unreadCountState.fetchPromise = (async () => {
                /* The bell shows notifications and alert deliveries, so the
                   badge counts both. The two live in separate tables with
                   separate endpoints and either can fail alone, so each is
                   settled on its own and a failure only costs its own count. */
                const [alerts, notifications] = await Promise.allSettled([
                    alertsApi.getUnreadCount() as Promise<{ count?: number }>,
                    apiClient<{ notifications: CommunityNotification[] }>(
                        `/api/notifications?unread=true&limit=${UNREAD_NOTIFICATION_CAP}`,
                    ),
                ]);

                const alertsCount =
                    alerts.status === 'fulfilled' && typeof alerts.value?.count === 'number'
                        ? alerts.value.count
                        : 0;
                const notificationsCount =
                    notifications.status === 'fulfilled' &&
                    Array.isArray(notifications.value?.notifications)
                        ? Math.min(
                            notifications.value.notifications.length,
                            UNREAD_NOTIFICATION_CAP,
                        )
                        : 0;

                return alertsCount + notificationsCount;
            })();
            const count = await unreadCountState.fetchPromise;
            if (isLogoutInProgress() || !hasActiveSessionCookie()) {
                broadcastUnreadCount(0);
                return;
            }
            writeCache(count);
            lastSuccessfulFetchAtRef.current = Date.now();
            unreadCountState.lastSuccessfulFetchAt = lastSuccessfulFetchAtRef.current;
            broadcastUnreadCount(count);
        } catch {
            // silent fail, keep stale value
        } finally {
            unreadCountState.fetchPromise = null;
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
            unreadCountState.lastSuccessfulFetchAt = cached.at;
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
                /* Notification settings live at `/jobs?tab=alerts`. There is no
                   `/alerts` route, and `pathname` omits the query, so the old
                   check never matched and the toasts never fired. */
                if (window.location.search.includes('tab=alerts')) {
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
