'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { apiClient } from '@/lib/api/core';
import { alertsApi } from '@/lib/api/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { cn } from '@/ui/cn';
import type { AlertFeedResponse, CommunityNotification } from '@fresherflow/types';
import {
    alertKindLabel,
    notifyUnreadChanged,
    timeAgo,
    toAlertItem,
    toNotificationItem,
    type NotificationItem,
} from '../notificationItems';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

const PREVIEW_LIMIT = 6;

/**
 * A bell means notifications. This used to be an alerts feed labelled "Job
 * Alerts" that linked to alert settings and never showed a single
 * notification, so it duplicated the notifications page and shadowed the
 * settings page with the same word. It now previews the same merged list the
 * notifications page renders.
 */
export function NotificationsDropdown({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { unreadCount, refresh } = useUnreadNotifications();
    const router = useRouter();

    const fetchRecent = useCallback(async () => {
        setLoading(true);
        // The two sources are independent tables. One failing must not blank
        // the other, so each is settled on its own.
        const [notificationsResult, alertsResult] = await Promise.allSettled([
            apiClient<{ notifications: CommunityNotification[] }>(
                `/api/notifications?limit=${PREVIEW_LIMIT}`,
            ),
            alertsApi.getFeed('all', PREVIEW_LIMIT) as Promise<AlertFeedResponse>,
        ]);

        const merged: NotificationItem[] = [];
        if (notificationsResult.status === 'fulfilled') {
            merged.push(
                ...notificationsResult.value.notifications.map(toNotificationItem),
            );
        }
        if (alertsResult.status === 'fulfilled') {
            const deliveries = alertsResult.value?.deliveries;
            if (Array.isArray(deliveries)) {
                merged.push(...deliveries.map(toAlertItem));
            }
        }
        merged.sort((a, b) => b.receivedAt - a.receivedAt);
        setItems(merged.slice(0, PREVIEW_LIMIT));
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            void fetchRecent();
        }
    }, [isOpen, fetchRecent]);

    const markRead = useCallback(
        async (item: NotificationItem) => {
            setItems((prev) =>
                prev.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, isRead: true } : candidate,
                ),
            );
            try {
                if (item.source === 'alerts') {
                    await alertsApi.markRead(item.id);
                } else {
                    await apiClient('/api/notifications/read', {
                        method: 'POST',
                        body: JSON.stringify({ ids: [item.id] }),
                    });
                }
            } catch {
                // A failed read is not worth interrupting the reader over.
            }
            refresh();
            notifyUnreadChanged();
        },
        [refresh],
    );

    const handleMarkAllRead = useCallback(async () => {
        setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
        await Promise.allSettled([
            apiClient('/api/notifications/read', {
                method: 'POST',
                body: JSON.stringify({}),
            }),
            alertsApi.markAllRead(),
        ]);
        refresh();
        notifyUnreadChanged();
    }, [refresh]);

    const handleItemClick = useCallback(
        (item: NotificationItem) => {
            if (!item.isRead) {
                void markRead(item);
            }
            setIsOpen(false);
            if (item.href) {
                router.push(item.href);
            } else if (item.opportunitySlug) {
                router.push(`/jobs/${item.opportunitySlug}`);
            } else if (item.fallbackHref) {
                router.push(item.fallbackHref);
            } else {
                router.push('/jobs?tab=notifications');
            }
        },
        [markRead, router],
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    suppressHydrationWarning
                    className={cn(
                        'relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer focus:outline-none',
                        className,
                    )}
                    aria-label="Notifications"
                >
                    <BellIcon className="w-4.5 h-4.5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 md:w-96 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground tracking-wide">
                            Notifications
                        </span>
                        {unreadCount > 0 ? (
                            <span className="px-2 py-0.5 text-xs font-extrabold rounded-xs bg-primary/10 text-primary border border-primary/20">
                                {unreadCount} unread
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-xs bg-muted text-muted-foreground">
                                Caught up
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => void handleMarkAllRead()}
                            className="text-xs font-semibold text-primary hover:underline px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span>Mark read</span>
                        </button>
                    )}
                </div>

                <div className="max-h-90 overflow-y-auto divide-y divide-border/30">
                    {loading && items.length === 0 ? (
                        <div className="p-4 space-y-3" aria-busy="true">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-muted/60 shrink-0" />
                                    <div className="h-3.5 bg-muted/60 rounded w-3/5" />
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <div className="w-10 h-10 rounded-xs bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                                <BellIcon className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <button
                                key={`${item.source}-${item.id}`}
                                type="button"
                                onClick={() => handleItemClick(item)}
                                className={cn(
                                    'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-3',
                                    !item.isRead && 'bg-primary/[0.03]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'block w-2 h-2 rounded-full shrink-0 mt-1.5',
                                        item.isRead ? 'bg-border' : 'bg-primary',
                                    )}
                                />
                                <span className="flex-1 min-w-0 space-y-0.5">
                                    <span className="flex items-center gap-2">
                                        {item.alertKind && (
                                            <span className="text-micro font-bold px-1.5 py-0.5 rounded-xs bg-muted text-muted-foreground">
                                                {alertKindLabel(item.alertKind)}
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                                            {timeAgo(item.receivedAt)}
                                        </span>
                                    </span>
                                    <span className="block text-xs font-semibold text-foreground leading-snug line-clamp-2">
                                        {item.title}
                                    </span>
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-3 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                    <Link
                        href="/jobs?tab=notifications"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        <span>View all</span>
                        <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                    <Link
                        href="/jobs?tab=alerts"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                    >
                        <Cog6ToothIcon className="w-3.5 h-3.5" />
                        <span>Notification settings</span>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
