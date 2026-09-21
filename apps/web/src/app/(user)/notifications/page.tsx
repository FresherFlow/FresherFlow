'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { communityApi } from '@fresherflow/api-client';
import type { CommunityNotification } from '@fresherflow/types';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { ArrowLeftIcon, Cog6ToothIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';

type NotificationItem = {
    id: string;
    title: string;
    body?: string | null;
    isRead: boolean;
    receivedAt: number;
    opportunitySlug?: string | null;
    opportunityTitle?: string | null;
    commentId?: string | null;
};

function actorName(notification: CommunityNotification): string {
    return notification.actor?.fullName || notification.actor?.username || 'Someone';
}

function toDisplayItem(notification: CommunityNotification): NotificationItem {
    const name = actorName(notification);
    const opportunityTitle = notification.opportunity?.title ?? null;
    let title: string;

    switch (notification.type) {
        case 'COMMENT_REPLY':
            title = `${name} replied to your comment`;
            break;
        case 'COMMENT_VOTE':
            title = `${name} voted on your comment`;
            break;
        case 'JOB_SIGNAL_MILESTONE':
            title = opportunityTitle ? `Your activity on ${opportunityTitle} is picking up` : 'Your signal milestone';
            break;
        case 'JOB_UPDATED':
            title = opportunityTitle ? `${opportunityTitle} was updated` : 'A job you follow was updated';
            break;
        case 'JOB_CLOSED':
            title = opportunityTitle ? `${opportunityTitle} is closing soon` : 'A job you follow is closing';
            break;
        case 'NEW_MATCHING_JOB':
        default:
            title = opportunityTitle ? `New match: ${opportunityTitle}` : 'A new matching job';
            break;
    }

    return {
        id: notification.id,
        title,
        body: notification.payload?.excerpt ?? null,
        isRead: Boolean(notification.readAt),
        receivedAt: new Date(notification.createdAt).getTime(),
        opportunitySlug: notification.opportunity?.slug ?? null,
        opportunityTitle,
        commentId: notification.commentId ?? null,
    };
}

function groupByDay(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const todayItems = items.filter(n => n.receivedAt >= today);
    const yesterdayItems = items.filter(n => n.receivedAt >= yesterday && n.receivedAt < today);
    const olderItems = items.filter(n => n.receivedAt < yesterday);

    const groups = [];
    if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (olderItems.length) groups.push({ label: 'Older', items: olderItems });
    return groups;
}

function NotificationsPageContent() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listNotifications();
            setNotifications(result.notifications.map(toDisplayItem));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const markAllRead = async () => {
        if (!notifications.some(n => !n.isRead)) return;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await communityApi.markNotificationsRead();
        } catch {
            void load();
        }
    };

    const markRead = async (notifId: string) => {
        setNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, isRead: true } : n)));
        try {
            await communityApi.markNotificationsRead([notifId]);
        } catch {
            void load();
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const groups = groupByDay(notifications);

    if (loading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <h2 className="text-base font-bold text-foreground">Could not load notifications</h2>
                <p className="text-muted-foreground text-xs">Please try again.</p>
                <button
                    onClick={() => void load()}
                    className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg hover:bg-primary/90 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer" aria-label="Go back">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Notifications</h1>
                        {unreadCount > 0 && (
                            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={() => void markAllRead()}
                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                        >
                            Clear all
                        </button>
                    )}
                    <Link href="/alerts" className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <Cog6ToothIcon className="w-5 h-5 text-muted-foreground" />
                    </Link>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/50">
                        <BriefcaseIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">No notifications yet</h2>
                        <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                            We&apos;ll let you know when someone replies to your discussion, or a job you follow changes.
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg hover:bg-primary/90 transition-all shadow"
                    >
                        Browse jobs
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map(group => (
                        <div key={group.label} className="space-y-1.5">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                                {group.label}
                            </p>
                            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                                {group.items.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            'flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer',
                                            !notif.isRead && 'bg-primary/5'
                                        )}
                                        onClick={() => {
                                            void markRead(notif.id);
                                            if (notif.opportunitySlug) {
                                                router.push(`/jobs/${notif.opportunitySlug}#discussion`);
                                            }
                                        }}
                                    >
                                        <div className={cn(
                                            'w-2 h-2 rounded-full mt-2 shrink-0',
                                            !notif.isRead ? 'bg-primary' : 'bg-transparent'
                                        )} />
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                                                {notif.title}
                                            </p>
                                            {notif.body && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">{notif.body}</p>
                                            )}
                                            {notif.opportunityTitle && (
                                                <p className="text-xs text-muted-foreground">{notif.opportunityTitle}</p>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                                            {new Date(notif.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function NotificationsPage() {
    return (
        <UsernameGate>
            <NotificationsPageContent />
        </UsernameGate>
    );
}
