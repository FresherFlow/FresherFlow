'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { alertsApi } from '@/lib/api/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { cn } from '@/lib/utils/utils';
import type { AlertDelivery, AlertKind, AlertFeedResponse } from '@fresherflow/types';
import toast from 'react-hot-toast';

function getKindBadge(kind: AlertKind) {
    switch (kind) {
        case 'DAILY_DIGEST':
            return { label: 'Daily Digest', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
        case 'CLOSING_SOON':
            return { label: 'Closing Soon', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        case 'HIGHLIGHT':
            return { label: 'Highlight', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 'APP_UPDATE':
            return { label: 'Update', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
        case 'EVENT_REMINDER':
            return { label: 'Event', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
        case 'NEW_JOB':
        default:
            return { label: 'New Job', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
}

function formatTimeAgo(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (isNaN(diffSeconds) || diffSeconds < 0) return 'Just now';
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AlertsDropdown({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
    const [loading, setLoading] = useState(false);
    const { unreadCount, refresh } = useUnreadNotifications();
    const router = useRouter();

    const fetchRecentAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await alertsApi.getFeed('all', 6) as AlertFeedResponse;
            if (res && Array.isArray(res.deliveries)) {
                setDeliveries(res.deliveries);
            }
        } catch {
            // silent fallback
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            void fetchRecentAlerts();
        }
    }, [isOpen, fetchRecentAlerts]);

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await alertsApi.markAllRead();
            setDeliveries((prev) => prev.map((item) => ({ ...item, readAt: new Date().toISOString() })));
            refresh();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('ff-alerts-updated'));
            }
            toast.success('All alerts marked as read');
        } catch {
            toast.error('Failed to mark alerts as read');
        }
    };

    const handleItemClick = async (item: AlertDelivery) => {
        if (!item.readAt) {
            try {
                await alertsApi.markRead(item.id);
                setDeliveries((prev) =>
                    prev.map((d) => (d.id === item.id ? { ...d, readAt: new Date().toISOString() } : d))
                );
                refresh();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('ff-alerts-updated'));
                }
            } catch {
                // ignore
            }
        }

        setIsOpen(false);
        if (item.opportunity?.slug) {
            router.push(`/opportunities/${item.opportunity.slug}`);
        } else {
            router.push('/alerts');
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        'relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer focus:outline-none',
                        className
                    )}
                    aria-label="Notifications"
                >
                    <BellIcon className="w-[18px] h-[18px]" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background animate-pulse" />
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 md:w-96 p-0 shadow-2xl rounded-2xl border border-border/80 bg-card overflow-hidden z-[110]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/40">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground tracking-wide">Notifications</span>
                        {unreadCount > 0 ? (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-primary/10 text-primary border border-primary/20">
                                {unreadCount} unread
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                                Caught up
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[11px] font-semibold text-primary hover:underline px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                                title="Mark all as read"
                            >
                                <CheckIcon className="w-3.5 h-3.5" />
                                <span>Mark read</span>
                            </button>
                        )}
                        <Link
                            href="/settings#alerts"
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                            title="Alert Settings"
                            aria-label="Alert Settings"
                        >
                            <Cog6ToothIcon className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Notification Feed Items */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/30">
                    {loading && deliveries.length === 0 ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-1.5 animate-pulse">
                                    <div className="h-3.5 bg-muted/60 rounded w-3/4" />
                                    <div className="h-3 bg-muted/40 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : deliveries.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                                <BellIcon className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-foreground">No recent alerts</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                                Customized job alerts match your preferences automatically.
                            </p>
                        </div>
                    ) : (
                        deliveries.map((item) => {
                            const badge = getKindBadge(item.kind);
                            const title = item.opportunity?.title || 'Job Alert Opportunity';
                            const company = item.opportunity?.company || 'Featured Employer';

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={cn(
                                        'p-3.5 hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-3 relative group',
                                        !item.readAt && 'bg-primary/[0.03]'
                                    )}
                                >
                                    <div className="shrink-0 pt-0.5">
                                        {!item.readAt ? (
                                            <span className="block w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10 mt-1" />
                                        ) : (
                                            <span className="block w-2 h-2 rounded-full bg-border mt-1" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                                                    badge.color
                                                )}
                                            >
                                                {badge.label}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {formatTimeAgo(item.sentAt)}
                                            </span>
                                        </div>

                                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                                            {title}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">{company}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border/40 bg-muted/30 flex items-center justify-between gap-2 text-xs">
                    <Link
                        href="/alerts"
                        onClick={() => setIsOpen(false)}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        <span>View all alerts</span>
                        <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                    <Link
                        href="/settings#alerts"
                        onClick={() => setIsOpen(false)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1.5"
                    >
                        <Cog6ToothIcon className="w-3.5 h-3.5" />
                        <span>Alert Settings</span>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
