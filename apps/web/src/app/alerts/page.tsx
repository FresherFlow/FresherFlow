'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth';
import { alertsApi, savedApi, actionsApi } from '@/shared/api/client';
import { calculateOpportunityMatch } from '@fresherflow/domain';
import { BellIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { Loader2 } from 'lucide-react';
import { Button } from '@/features/system/components/ui/Button';
import { cn } from '@repo/ui/utils/cn';
import { getOpportunityPathFromItem } from '@fresherflow/domain';
import toast from 'react-hot-toast';
import { ActionType } from '@fresherflow/types';
import type { Opportunity, Profile, EducationLevel } from '@fresherflow/types';

type AlertKindFilter = 'all' | 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';

type AlertFeedItem = {
    id: string;
    kind: 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';
    channel: 'EMAIL' | 'APP' | 'PUSH';
    sentAt: string;
    readAt: string | null;
    metadata: string | null;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        allowedDegrees?: string[];
        allowedCourses?: string[];
        allowedSpecializations?: string[];
        allowedPassoutYears?: number[];
        requiredSkills?: string[];
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

type DigestOpportunityItem = {
    id: string;
    slug: string;
    title: string;
    company: string;
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    locations: string[];
    applyLink?: string | null;
    companyWebsite?: string | null;
    expiresAt?: string | null;
    isSaved?: boolean;
};

type DigestItemsResponse = {
    items: DigestOpportunityItem[];
    requestedCount: number;
    activeCount: number;
};

type PendingApplyFollowup = {
    alertId: string;
    opportunityId: string;
    opportunityTitle: string;
    createdAt: number;
};

const ALERTS_UPDATED_EVENT = 'ff-alerts-updated';
const APPLY_FOLLOWUP_WINDOW_MS = 5 * 60 * 1000;
const APPLY_PROMPTED_SESSION_KEY = 'ff_alert_apply_prompted_v1';

function isEducationLevel(value: string): value is EducationLevel {
    return value === 'DIPLOMA' || value === 'DEGREE' || value === 'PG';
}

function buildAlertOpportunityForMatch(item: NonNullable<AlertFeedItem['opportunity']>): Opportunity {
    return {
        id: item.id,
        slug: item.slug,
        type: item.type as Opportunity['type'],
        status: 'PUBLISHED' as Opportunity['status'],
        title: item.title,
        company: item.company,
        description: '',
        allowedDegrees: (item.allowedDegrees || []).filter((degree): degree is EducationLevel => isEducationLevel(degree)),
        allowedCourses: item.allowedCourses || [],
        allowedSpecializations: item.allowedSpecializations || [],
        allowedPassoutYears: item.allowedPassoutYears || [],
        requiredSkills: item.requiredSkills || [],
        locations: [],
        linkHealth: 'HEALTHY' as Opportunity['linkHealth'],
        verificationFailures: 0,
        lastVerifiedAt: new Date(),
        postedAt: new Date(),
        adminId: '',
        expiresAt: item.expiresAt || undefined,
        applyLink: item.applyLink || undefined,
        companyWebsite: item.companyWebsite || undefined,
    };
}

function getLiveMatchMetaText(item: AlertFeedItem, profile: Profile | null | undefined): string | null {
    if (!profile || !item.opportunity) return null;
    const liveMatch = calculateOpportunityMatch(profile, buildAlertOpportunityForMatch(item.opportunity));
    if (liveMatch.reason.startsWith('Not eligible')) return liveMatch.reason;
    if (liveMatch.reason === 'Eligible' || liveMatch.reason === 'Complete profile for match score') return liveMatch.reason;
    return null;
}

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

function readPromptedOpportunityIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.sessionStorage.getItem(APPLY_PROMPTED_SESSION_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0));
    } catch {
        return new Set();
    }
}

function writePromptedOpportunityIds(ids: Set<string>) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(APPLY_PROMPTED_SESSION_KEY, JSON.stringify(Array.from(ids)));
    } catch {
        // ignore session storage errors
    }
}

export default function AlertsCenterPage() {
    const { user, profile, isLoading } = useAuth();
    const [kind, setKind] = useState<AlertKindFilter>('all');
    const [feed, setFeed] = useState<AlertFeedResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedDigestIds, setExpandedDigestIds] = useState<Record<string, boolean>>({});
    const [digestItemsByAlert, setDigestItemsByAlert] = useState<Record<string, DigestItemsResponse>>({});
    const [digestLoadingByAlert, setDigestLoadingByAlert] = useState<Record<string, boolean>>({});
    const [appliedOpportunityIds, setAppliedOpportunityIds] = useState<Set<string>>(new Set());
    const [pendingApplyFollowup, setPendingApplyFollowup] = useState<PendingApplyFollowup | null>(null);
    const [promptedOpportunityIds, setPromptedOpportunityIds] = useState<Set<string>>(new Set());
    const [dismissingAlertIds, setDismissingAlertIds] = useState<Set<string>>(new Set());

    const emitAlertsUpdated = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event(ALERTS_UPDATED_EVENT));
        }
    }, []);

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
            emitAlertsUpdated();
        } catch {
            // silent fail
        }
    };

    const markAsRead = useCallback(async (id: string) => {
        try {
            await alertsApi.markRead(id);
            setFeed(prev => prev ? {
                ...prev,
                unreadCount: Math.max(
                    0,
                    prev.unreadCount - (prev.deliveries.some(d => d.id === id && !d.readAt) ? 1 : 0)
                ),
                deliveries: prev.deliveries.map(d => d.id === id && !d.readAt ? { ...d, readAt: new Date().toISOString() } : d)
            } : null);
            emitAlertsUpdated();
        } catch {
            // silent fail
        }
    }, [emitAlertsUpdated]);

    const dismissAlert = useCallback(async (id: string) => {
        if (dismissingAlertIds.has(id)) return;
        setDismissingAlertIds((prev) => new Set(prev).add(id));
        try {
            await alertsApi.dismiss(id);
            setFeed((prev) => {
                if (!prev) return prev;
                const target = prev.deliveries.find((item) => item.id === id);
                const wasUnread = Boolean(target && !target.readAt);
                return {
                    ...prev,
                    unreadCount: Math.max(0, prev.unreadCount - (wasUnread ? 1 : 0)),
                    deliveries: prev.deliveries.filter((item) => item.id !== id),
                };
            });
            emitAlertsUpdated();
        } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Failed to dismiss alert');
        } finally {
            setDismissingAlertIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [dismissingAlertIds, emitAlertsUpdated]);

    const markPrompted = useCallback((opportunityId: string) => {
        setPromptedOpportunityIds((prev) => {
            const next = new Set(prev);
            next.add(opportunityId);
            writePromptedOpportunityIds(next);
            return next;
        });
    }, []);

    const handleApplyFollowupConfirm = useCallback(async (payload: PendingApplyFollowup) => {
        try {
            await actionsApi.track(payload.opportunityId, ActionType.APPLIED);
            setAppliedOpportunityIds((prev) => new Set(prev).add(payload.opportunityId));
            if (payload.alertId) {
                await markAsRead(payload.alertId);
            }
            toast.success('Marked as applied');
        } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Could not mark as applied');
        }
    }, [markAsRead]);

    const maybeShowApplyFollowup = useCallback(() => {
        if (!pendingApplyFollowup) return;
        if (document.visibilityState !== 'visible') return;
        const elapsed = Date.now() - pendingApplyFollowup.createdAt;
        if (elapsed > APPLY_FOLLOWUP_WINDOW_MS) {
            setPendingApplyFollowup(null);
            return;
        }
        if (promptedOpportunityIds.has(pendingApplyFollowup.opportunityId)) {
            setPendingApplyFollowup(null);
            return;
        }

        markPrompted(pendingApplyFollowup.opportunityId);
        const payload = pendingApplyFollowup;
        setPendingApplyFollowup(null);

        toast.custom((t) => (
            <div className="w-[300px] rounded-lg border border-border bg-card p-3 shadow-lg">
                <p className="text-sm font-semibold text-foreground">Did you apply?</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">{payload.opportunityTitle}</p>
                <div className="mt-3 flex gap-2">
                    <button
                        className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                        onClick={async () => {
                            toast.dismiss(t.id);
                            await handleApplyFollowupConfirm(payload);
                        }}
                    >
                        Yes, mark applied
                    </button>
                    <button
                        className="h-8 px-3 rounded-md border border-border text-xs font-semibold"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Not yet
                    </button>
                </div>
            </div>
        ), { duration: 12000 });
    }, [handleApplyFollowupConfirm, pendingApplyFollowup, promptedOpportunityIds, markPrompted]);

    const handleApplyClick = async (
        alertId: string,
        opportunity: {
            id: string;
            title: string;
            applyLink?: string | null;
            companyWebsite?: string | null;
            slug: string;
            type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        },
        shouldMarkRead: boolean
    ) => {
        const href = getOpportunityPathFromItem(opportunity);
        const target = opportunity.applyLink || opportunity.companyWebsite || href;
        window.open(target, '_blank', 'noopener,noreferrer');
        if (shouldMarkRead) {
            void markAsRead(alertId);
        }

        if (appliedOpportunityIds.has(opportunity.id) || promptedOpportunityIds.has(opportunity.id)) return;
        setPendingApplyFollowup({
            alertId,
            opportunityId: opportunity.id,
            opportunityTitle: opportunity.title,
            createdAt: Date.now()
        });
    };

    const loadDigestItems = async (alertId: string) => {
        if (digestItemsByAlert[alertId] || digestLoadingByAlert[alertId]) return;
        setDigestLoadingByAlert((prev) => ({ ...prev, [alertId]: true }));
        try {
            const response = await alertsApi.getDigestItems(alertId) as DigestItemsResponse;
            setDigestItemsByAlert((prev) => ({ ...prev, [alertId]: response }));
        } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Failed to load digest items');
            setDigestItemsByAlert((prev) => ({
                ...prev,
                [alertId]: { items: [], requestedCount: 0, activeCount: 0 }
            }));
        } finally {
            setDigestLoadingByAlert((prev) => ({ ...prev, [alertId]: false }));
        }
    };

    const toggleDigestExpand = async (alertId: string, shouldMarkRead: boolean) => {
        const nextExpanded = !expandedDigestIds[alertId];
        setExpandedDigestIds((prev) => ({ ...prev, [alertId]: nextExpanded }));
        if (nextExpanded) {
            await loadDigestItems(alertId);
            if (shouldMarkRead) {
                void markAsRead(alertId);
            }
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

    const toggleSaveFromDigest = async (deliveryId: string, opportunityId: string) => {
        try {
            const response = await savedApi.toggle(opportunityId) as { saved: boolean };
            setDigestItemsByAlert((prev) => {
                const current = prev[deliveryId];
                if (!current) return prev;
                return {
                    ...prev,
                    [deliveryId]: {
                        ...current,
                        items: current.items.map((item) => item.id === opportunityId
                            ? { ...item, isSaved: response.saved }
                            : item)
                    }
                };
            });
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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setPromptedOpportunityIds(readPromptedOpportunityIds());
    }, []);

    useEffect(() => {
        if (!user) return;
        const loadAppliedActions = async () => {
            try {
                const response = await actionsApi.list() as {
                    actions: Array<{ opportunityId: string; actionType: string }>;
                };
                const applied = new Set(
                    (response.actions || [])
                        .filter((action) => action.actionType === ActionType.APPLIED)
                        .map((action) => action.opportunityId)
                );
                setAppliedOpportunityIds(applied);
            } catch {
                // non-blocking
            }
        };
        void loadAppliedActions();
    }, [user]);

    useEffect(() => {
        const onFocus = () => maybeShowApplyFollowup();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') maybeShowApplyFollowup();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [maybeShowApplyFollowup]);

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
            <main className="max-w-4xl mx-auto px-4 py-0 md:py-8 space-y-2">
                <div className="md:hidden flex items-start justify-between gap-3 pt-2">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
                        <p className="text-sm text-muted-foreground leading-tight">Relevant updates based on your profile</p>
                    </div>
                    <Link href="/account/alerts" className="mt-1 text-base font-semibold text-primary hover:underline">
                        Preferences
                    </Link>
                </div>

                <div className="hidden md:flex items-center justify-between gap-3">
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

                <div className="z-20 rounded-xl border border-border bg-card/95 backdrop-blur p-3 space-y-3 md:sticky md:top-16">
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <FilterChip label={`All (${summary.total})`} active={kind === 'all'} onClick={() => setKind('all')} />
                        <FilterChip label={`New (${summary.newJob})`} active={kind === 'NEW_JOB'} onClick={() => setKind('NEW_JOB')} />
                        <FilterChip label={`Events (${summary.eventReminder})`} active={kind === 'EVENT_REMINDER'} onClick={() => setKind('EVENT_REMINDER')} />
                        <FilterChip label={`Digest (${summary.dailyDigest})`} active={kind === 'DAILY_DIGEST'} onClick={() => setKind('DAILY_DIGEST')} />
                        <FilterChip label={`Closing (${summary.closingSoon})`} active={kind === 'CLOSING_SOON'} onClick={() => setKind('CLOSING_SOON')} />
                        <FilterChip label={`Highlight (${summary.highlight})`} active={kind === 'HIGHLIGHT'} onClick={() => setKind('HIGHLIGHT')} />
                        <FilterChip label={`App (${summary.appUpdate})`} active={kind === 'APP_UPDATE'} onClick={() => setKind('APP_UPDATE')} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                            {feed?.unreadCount || 0} unread
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Link href="/account/alerts" className="hidden md:inline-flex h-8 items-center px-2.5 text-[11px] font-semibold text-primary hover:underline">
                                Preferences
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => void loadFeed(kind)} className="h-8 text-xs px-3">
                                Refresh
                            </Button>
                            {feed && feed.unreadCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs px-3">
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
                            const isDigest = item.kind === 'DAILY_DIGEST';
                            const isDigestExpanded = Boolean(expandedDigestIds[item.id]);
                            const digestData = digestItemsByAlert[item.id];
                            const digestLoading = Boolean(digestLoadingByAlert[item.id]);
                            const matchMetaText = getLiveMatchMetaText(item, profile);
                            const metaText = matchMetaText || getAlertMetaText(item);
                            const kindLabel =
                                item.kind === 'CLOSING_SOON' ? 'Closing soon' :
                                    item.kind === 'EVENT_REMINDER' ? 'Event reminder' :
                                    item.kind === 'DAILY_DIGEST' ? 'Daily digest' :
                                        item.kind === 'HIGHLIGHT' ? 'Highlight' :
                                            item.kind === 'NEW_JOB' ? 'New job' : 'App Update';
                            const channelLabel = item.channel === 'APP' ? null : item.channel;
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
                                            ? "border-border bg-card/70 text-muted-foreground"
                                            : "border-primary/30 bg-card shadow-sm hover:border-primary/40"
                                    )}
                                >





                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <span className={cn(
                                            "text-xs md:text-sm font-semibold uppercase tracking-wide px-2 py-1 rounded-md border",
                                            kindColor,
                                            item.readAt && "opacity-60"
                                        )}>
                                            {kindLabel}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {item.collapsedCount && item.collapsedCount > 1 && (
                                                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                                                    {item.collapsedCount} updates
                                                </span>
                                            )}
                                            <span className="text-xs md:text-sm font-bold text-muted-foreground inline-flex items-center gap-1.5 uppercase tracking-wider">
                                                <ClockIcon className="w-3 h-3" />
                                                {new Date(item.sentAt).toLocaleString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => void dismissAlert(item.id)}
                                                disabled={dismissingAlertIds.has(item.id)}
                                                className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-50"
                                                aria-label="Dismiss alert"
                                                title="Dismiss"
                                            >
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={cn(
                                            "text-sm md:text-base font-semibold leading-tight group-hover:text-primary transition-colors",
                                            item.readAt ? "text-foreground/90" : "text-foreground"
                                        )}>
                                            {title}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold text-foreground/75">{company}</p>
                                            {channelLabel && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-border" />
                                                    <p className="text-xs md:text-sm font-bold text-primary/80 uppercase tracking-widest">{channelLabel}</p>
                                                </>
                                            )}
                                        </div>
                                        {metaText && (
                                            <p className="text-sm font-semibold text-muted-foreground">{metaText}</p>
                                        )}
                                    </div>
                                    <div className={cn("mt-3 grid gap-2", item.opportunity ? "grid-cols-3" : "grid-cols-1")}>
                                        {isDigest ? (
                                            <button
                                                onClick={() => void toggleDigestExpand(item.id, !item.readAt)}
                                                className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                            >
                                                {isDigestExpanded ? 'Hide matches' : 'Open'}
                                            </button>
                                        ) : (
                                            <Link
                                                href={href}
                                                onClick={() => !item.readAt && markAsRead(item.id)}
                                                className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                            >
                                                Open
                                            </Link>
                                        )}
                                        {item.opportunity && (
                                            <button
                                                onClick={() => void handleApplyClick(item.id, item.opportunity!, !item.readAt)}
                                                className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                            >
                                                Apply
                                            </button>
                                        )}
                                        {item.opportunity && (
                                            <button
                                                onClick={() => void toggleSaveFromAlert(item.id, item.opportunity!.id)}
                                                className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                            >
                                                {item.opportunity.isSaved ? 'Unsave' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                    {isDigestExpanded && (
                                        <div className="mt-3 rounded-lg border border-border bg-background/50 p-3 space-y-2">
                                            {digestLoading && (
                                                <p className="text-xs text-muted-foreground">Loading matched opportunities...</p>
                                            )}
                                            {!digestLoading && digestData && digestData.items.length === 0 && (
                                                <p className="text-xs text-muted-foreground">No active opportunities available for this digest.</p>
                                            )}
                                            {!digestLoading && digestData && digestData.activeCount < digestData.requestedCount && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Showing {digestData.activeCount} of {digestData.requestedCount} (some listings closed).
                                                </p>
                                            )}
                                            {!digestLoading && digestData?.items.map((digestItem) => {
                                                const digestHref = getOpportunityPathFromItem(digestItem);
                                                return (
                                                    <div key={digestItem.id} className="rounded-md border border-border bg-card p-2.5 space-y-2">
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground leading-tight">{digestItem.title}</p>
                                                            <p className="text-xs text-muted-foreground">{digestItem.company}</p>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <Link
                                                                href={digestHref}
                                                                onClick={() => !item.readAt && markAsRead(item.id)}
                                                                className="h-9 px-2 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                                            >
                                                                Open
                                                            </Link>
                                                            <button
                                                                onClick={() => void handleApplyClick(item.id, digestItem, !item.readAt)}
                                                                className="h-9 px-2 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                                            >
                                                                Apply
                                                            </button>
                                                            <button
                                                                onClick={() => void toggleSaveFromDigest(item.id, digestItem.id)}
                                                                className="h-9 px-2 rounded-md border border-border bg-background text-xs font-semibold hover:border-primary/30 inline-flex items-center justify-center"
                                                            >
                                                                {digestItem.isSaved ? 'Unsave' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    )}
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
                "h-8 shrink-0 px-3 rounded-full border text-xs font-semibold transition-colors",
                active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/30"
            )}
        >
            {label}
        </button>
    );
}






