'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate } from '@/lib/components/ProfileGate';
import { database } from '@/lib/api/firebase';
import { ref, onValue, update } from 'firebase/database';
import { ArrowLeftIcon, Cog6ToothIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';

type NotificationItem = {
    id: string;
    title: string;
    company?: string;
    matchScore?: number;
    matchReason?: string;
    isRead: boolean;
    receivedAt: number;
    opportunityId?: string;
    kind?: 'closing_soon' | 'new_match' | 'following';
};

type RtdbNotifications = Record<string, Omit<NotificationItem, 'id'>>;

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
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        const notifRef = ref(database, `/users/${user.id}/notifications`);
        const unsubscribe = onValue(notifRef, (snapshot) => {
            const val = snapshot.val() as RtdbNotifications | null;
            if (val) {
                const list = Object.entries(val)
                    .map(([id, item]) => ({ ...item, id }))
                    .sort((a, b) => b.receivedAt - a.receivedAt)
                    .slice(0, 50);
                setNotifications(list);
            } else {
                setNotifications([]);
            }
            setLoading(false);
        }, () => setLoading(false));

        return () => unsubscribe();
    }, [user?.id]);

    const markAllRead = async () => {
        if (!user?.id || !notifications.length) return;
        const patch: Record<string, { isRead: boolean }> = {};
        notifications.forEach(n => {
            if (!n.isRead) patch[n.id] = { isRead: true };
        });
        if (Object.keys(patch).length === 0) return;
        const notifRef = ref(database, `/users/${user.id}/notifications`);
        await update(notifRef, patch);
    };

    const markRead = async (notifId: string) => {
        if (!user?.id) return;
        const itemRef = ref(database, `/users/${user.id}/notifications/${notifId}`);
        await update(itemRef, { isRead: true });
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
                            onClick={markAllRead}
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
                            We&apos;ll notify you about matching jobs, closing deadlines, and your followed companies.
                        </p>
                    </div>
                    <Link
                        href="/account/alerts"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-[11px] rounded-lg hover:bg-primary/90 transition-all shadow"
                    >
                        Alert Settings
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map(group => (
                        <div key={group.label} className="space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
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
                                            if (notif.opportunityId) {
                                                router.push(`/${notif.opportunityId}`);
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
                                            {notif.company && (
                                                <p className="text-xs text-muted-foreground">{notif.company}</p>
                                            )}
                                            {notif.matchScore !== undefined && notif.matchScore > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                    {notif.matchScore}% match
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
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
        <AuthGate>
            <NotificationsPageContent />
        </AuthGate>
    );
}
