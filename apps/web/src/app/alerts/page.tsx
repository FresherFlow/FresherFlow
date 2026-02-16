'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { alertsApi, savedApi } from '@/lib/api/client';
import { BellIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import toast from 'react-hot-toast';

type AlertKindFilter = 'all' | 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';

type AlertFeedItem = {
    id: string;
    kind: 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';
    channel: 'EMAIL' | 'APP';
    sentAt: string;
    readAt: string | null;
    metadata: string | null;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        expiresAt: string | null;
        applyLink?: string | null;
        companyWebsite?: string | null;
        isSaved?: boolean;
    } | null;
};

type AlertFeedResponse = {
    deliveries: AlertFeedItem[];
    unreadCount: number;
    summary: {
        total: number;
        dailyDigest: number;
        closingSoon: number;
        highlight: number;
        appUpdate: number;
        newJob: number;
        eventReminder: number;
    };
};

type DisplayAlertItem = AlertFeedItem & {
    collapsedCount?: number;
};

function getAlertMetaText(item: AlertFeedItem): string | null {
    if (!item.metadata) return null;

    try {
        const metadata = JSON.parse(item.metadata) as {
            relevanceScore?: number;
            hoursLeft?: number;
            count?: number;
            relevanceReason?: string;
            eventTitle?: string;
            eventDate?: string;
            reminderWindow?: string;
        };

        if (item.kind === 'NEW_JOB' && typeof metadata.relevanceScore === 'number') {
            return `Match score ${Math.round(metadata.relevanceScore)}%`;
        }

        if (item.kind === 'CLOSING_SOON' && typeof metadata.hoursLeft === 'number') {
            return metadata.hoursLeft <= 24
                ? `${metadata.hoursLeft}h remaining`
                : `${Math.ceil(metadata.hoursLeft / 24)}d remaining`;
        }

        if ((item.kind === 'NEW_JOB' || item.kind === 'CLOSING_SOON') && typeof metadata.relevanceReason === 'string' && metadata.relevanceReason.trim().length > 0) {
            return metadata.relevanceReason;
        }

        if (item.kind === 'DAILY_DIGEST' && typeof metadata.count === 'number') {
            return `${metadata.count} matching opportunities`;
        }

        if (item.kind === 'EVENT_REMINDER') {
            const eventDate = metadata.eventDate ? new Date(metadata.eventDate) : null;
            if (eventDate && !Number.isNaN(eventDate.getTime())) {
                return `${metadata.eventTitle || 'Upcoming event'} • ${eventDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
            }
            return metadata.eventTitle || 'Upcoming milestone';
        }
    } catch {
        return null;
    }

    return null;
}

export default function AlertsCenterPage() {
    const { user, isLoading } = useAuth();
    const [kind, setKind] = useState<AlertKindFilter>('all');
    const [feed, setFeed] = useState<AlertFeedResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadFeed = async (nextKind: AlertKindFilter = kind) => {
        setError(null);
        try {
            const response = await alertsApi.getFeed(nextKind, 50);
            setFeed(response as AlertFeedResponse);
        } catch (err: unknown) {
            setError((err as Error)?.message || 'Failed to load alerts');
        }
    };

    const markAllRead = async () => {
        try {
            await alertsApi.markAllRead();
            setFeed(prev => prev ? {
                ...prev,
                unreadCount: 0,
                deliveries: prev.deliveries.map(d => ({ ...d, readAt: new Date().toISOString() }))
            } : null);
        } catch {
            // silent fail
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await alertsApi.markRead(id);
            setFeed(prev => prev ? {
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
                deliveries: prev.deliveries.map(d => d.id === id ? { ...d, readAt: new Date().toISOString() } : d)
            } : null);
        } catch {
            // silent fail
        }
    };

    const toggleSaveFromAlert = async (deliveryId: string, opportunityId: string) => {
        try {
            const response = await savedApi.toggle(opportunityId) as { saved: boolean };
            setFeed((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    deliveries: prev.deliveries.map((item) => item.id === deliveryId && item.opportunity
                        ? { ...item, opportunity: { ...item.opportunity, isSaved: response.saved } }
                        : item),
                };
            });
            void markAsRead(deliveryId);
            toast.success(response.saved ? 'Saved' : 'Removed from saved');
        } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Failed to update save');
        }
    };

    useEffect(() => {
        if (isLoading || !user) return;
        void loadFeed(kind);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, user, kind]);

    const summary = useMemo(
        () => feed?.summary || { total: 0, dailyDigest: 0, closingSoon: 0, highlight: 0, appUpdate: 0, newJob: 0, eventReminder: 0 },
        [feed]
    );

    const displayDeliveries = useMemo<DisplayAlertItem[]>(() => {
        const deliveries = feed?.deliveries || [];
        if (kind !== 'all') return deliveries;

        const collapsed = new Map<string, DisplayAlertItem>();
        for (const item of deliveries) {
            const key = item.opportunity?.id ? `opp:${item.opportunity.id}` : `alert:${item.id}`;
            const existing = collapsed.get(key);
            if (!existing) {
                collapsed.set(key, { ...item, collapsedCount: 1 });
                continue;
            }
            existing.collapsedCount = (existing.collapsedCount || 1) + 1;
            if (!existing.readAt && item.readAt) {
                continue;
            }
            if (existing.readAt && !item.readAt) {
                existing.readAt = null;
            }
        }
        return Array.from(collapsed.values());
    }, [feed?.deliveries, kind]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Sign in to view alerts.</p>
                    <Link href="/login" className="premium-button !w-fit px-6">Sign in</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-16">
            <main className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center hover:border-primary/30">
                            <ArrowLeftIcon className="w-4 h-4 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-foreground">Alerts</h1>
                            <p className="text-xs text-muted-foreground">Relevant updates based on your profile</p>
                        </div>
                    </div>
                    <Link href="/account/alerts" className="text-xs font-semibold text-primary hover:underline">
                        Preferences
                    </Link>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <FilterChip label={`All (${summary.total})`} active={kind === 'all'} onClick={() => setKind('all')} />
                        <FilterChip label={`New (${summary.newJob})`} active={kind === 'NEW_JOB'} onClick={() => setKind('NEW_JOB')} />
                        <FilterChip label={`Events (${summary.eventReminder})`} active={kind === 'EVENT_REMINDER'} onClick={() => setKind('EVENT_REMINDER')} />
                        <FilterChip label={`Digest (${summary.dailyDigest})`} active={kind === 'DAILY_DIGEST'} onClick={() => setKind('DAILY_DIGEST')} />
                        <FilterChip label={`Closing (${summary.closingSoon})`} active={kind === 'CLOSING_SOON'} onClick={() => setKind('CLOSING_SOON')} />
                        <FilterChip label={`Highlight (${summary.highlight})`} active={kind === 'HIGHLIGHT'} onClick={() => setKind('HIGHLIGHT')} />
                        <FilterChip label={`App (${summary.appUpdate})`} active={kind === 'APP_UPDATE'} onClick={() => setKind('APP_UPDATE')} />
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {feed?.unreadCount || 0} unread
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => void loadFeed(kind)} className="h-8 text-xs">
                                Refresh
                            </Button>
                            {feed && feed.unreadCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs">
                                    Mark all read
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-5 space-y-3">
                        <p className="text-sm font-medium text-foreground">Could not load alerts</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => void loadFeed(kind)} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">
                            Retry
                        </Button>
                    </div>
                ) : feed && displayDeliveries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                            <BellIcon className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">No alerts yet</p>
                            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                                You&apos;re all caught up! New alerts will appear here when they match your profile.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayDeliveries.map((item) => {
                            const title = item.opportunity?.title || 'Opportunity update';
                            const company = item.opportunity?.company || 'FresherFlow';
                            const href = item.opportunity ? getOpportunityPathFromItem(item.opportunity) : '/opportunities';
                            const metaText = getAlertMetaText(item);
                            const kindLabel =
                                item.kind === 'CLOSING_SOON' ? 'Closing soon' :
                                    item.kind === 'EVENT_REMINDER' ? 'Event reminder' :
                                    item.kind === 'DAILY_DIGEST' ? 'Daily digest' :
                                        item.kind === 'HIGHLIGHT' ? 'Highlight' :
                                            item.kind === 'NEW_JOB' ? 'New job' : 'App Update';
                            const kindColor =
                                item.kind === 'CLOSING_SOON' ? 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-300' :
                                item.kind === 'EVENT_REMINDER' ? 'text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300' :
                                item.kind === 'NEW_JOB' ? 'text-primary bg-primary/10 border-primary/20' :
                                'text-muted-foreground bg-muted border-border';

                            return (
                                <article
                                    key={item.id}
                                    className={cn(
                                        "group block rounded-xl border transition-all p-4 relative overflow-hidden",
                                        item.readAt
                                            ? "border-border bg-card text-muted-foreground"
                                            : "border-primary/20 bg-card shadow-sm hover:border-primary/30"
                                    )}
                                >
                                    {!item.readAt && (
                                        <div className="absolute top-3 right-3">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3 mb-2.5">
                                        <span className={cn(
                                            "text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border",
                                            kindColor,
                                            item.readAt && "opacity-60"
                                        )}>
                                            {kindLabel}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {item.collapsedCount && item.collapsedCount > 1 && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                                                    {item.collapsedCount} updates
                                                </span>
                                            )}
                                            <span className="text-[9px] font-bold text-muted-foreground/60 inline-flex items-center gap-1.5 uppercase tracking-wider">
                                                <ClockIcon className="w-3 h-3" />
                                                {new Date(item.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={cn(
                                            "text-sm font-semibold leading-tight group-hover:text-primary transition-colors",
                                            item.readAt ? "text-muted-foreground/80" : "text-foreground"
                                        )}>
                                            {title}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold text-muted-foreground/60">{company}</p>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">{item.channel}</p>
                                        </div>
                                        {metaText && (
                                            <p className="text-[11px] font-semibold text-muted-foreground/80">{metaText}</p>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <Link
                                            href={href}
                                            onClick={() => !item.readAt && markAsRead(item.id)}
                                            className="h-8 px-3 rounded-md border border-border bg-background text-[11px] font-semibold hover:border-primary/30 inline-flex items-center"
                                        >
                                            Open
                                        </Link>
                                        {item.opportunity && (
                                            <button
                                                onClick={() => {
                                                    const target = item.opportunity?.applyLink || item.opportunity?.companyWebsite || href;
                                                    window.open(target, '_blank', 'noopener,noreferrer');
                                                    if (!item.readAt) void markAsRead(item.id);
                                                }}
                                                className="h-8 px-3 rounded-md border border-border bg-background text-[11px] font-semibold hover:border-primary/30 inline-flex items-center"
                                            >
                                                Apply
                                            </button>
                                        )}
                                        {item.opportunity && (
                                            <button
                                                onClick={() => void toggleSaveFromAlert(item.id, item.opportunity!.id)}
                                                className="h-8 px-3 rounded-md border border-border bg-background text-[11px] font-semibold hover:border-primary/30 inline-flex items-center"
                                            >
                                                {item.opportunity.isSaved ? 'Unsave' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

function FilterChip({ label, active, onClick }: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "h-8 px-3 rounded-full border text-xs font-semibold transition-colors",
                active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/30"
            )}
        >
            {label}
        </button>
    );
}
