'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { communityApi, resourcesApi } from '@/features/contribute/api/contributions';
import { UnauthorizedError } from '@/lib/api/core';
import type {
    MyContributionsResult,
    MyResourcesResult,
    MySubmissionItem,
    SubmissionViewState,
} from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { COMMUNITY_UI_ENABLED } from '@/features/community/communityUi';

const STATE_CHIP: Record<SubmissionViewState, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    LIVE: { label: 'Live', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'destructive' },
    MERGED: { label: 'Merged', variant: 'secondary' },
};

const GENERIC_CHIP: Record<string, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
    PENDING_REVIEW: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Live', variant: 'success' },
    ACTIVE: { label: 'Live', variant: 'success' },
    ARCHIVED: { label: 'Removed', variant: 'secondary' },
    DELETED: { label: 'Removed', variant: 'destructive' },
};

interface HistoryRow {
    key: string;
    kind: string;
    title: string;
    subtitle: string | null;
    detail: string | null;
    createdAt: string;
    chip: { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' };
    href: string | null;
    hrefLabel: string | null;
    notice: string | null;
    noticeTone: 'danger' | 'muted';
    resubmitSource: string | null;
}

export interface ContributionStats {
    pending: number;
    live: number;
    needsAttention: number;
}

export type HistoryFilter = 'ALL' | 'PENDING' | 'LIVE' | 'REJECTED';

const FILTERS: Array<{ value: HistoryFilter; label: string }> = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'LIVE', label: 'Live' },
    { value: 'REJECTED', label: 'Rejected' },
];

/**
 * Track A coordination: ContributeHub wants Pending / Live / Needs-attention
 * counts. needsAttention counts REJECTED rows only — MERGED rows are
 * informational ("Matched to existing listing", nothing to fix) so they stay
 * out of the attention count. Computed from the already-loaded `rows`, never
 * a new fetch.
 */
export function getHistoryStats(rows: HistoryRow[]): ContributionStats {
    let pending = 0;
    let live = 0;
    let needsAttention = 0;
    for (const row of rows) {
        if (row.chip.label === 'Pending') pending += 1;
        else if (row.chip.label === 'Live') live += 1;
        else if (row.chip.label === 'Rejected') needsAttention += 1;
    }
    return { pending, live, needsAttention };
}

/** Pure client-side filter over the loaded rows — no fetch, no pagination. */
export function filterHistoryRows(rows: HistoryRow[], filter: HistoryFilter): HistoryRow[] {
    switch (filter) {
        case 'PENDING':
            return rows.filter((row) => row.chip.label === 'Pending');
        case 'LIVE':
            return rows.filter((row) => row.chip.label === 'Live');
        case 'REJECTED':
            return rows.filter((row) => row.chip.label === 'Rejected');
        case 'ALL':
        default:
            return rows;
    }
}

export interface ContributionHistoryProps {
    onContribute?: () => void;
    refreshKey?: number;
    onStatsChange?: (stats: ContributionStats) => void;
    /**
     * Optimistic composer entry (Track A): the hub sets this in `onSubmitted`
     * alongside `refreshKey` with a generic label — the sheet's `onSubmitted`
     * carries no title, so this never fabricates job details. Rendered as a
     * top Pending card while the refetch lands; dropped when `rows` refreshes
     * (see baselineRef below) and never counted in stats/filters.
     */
    justSubmitted?: { title: string; kind: string } | null;
}

function chipFor(status: string): HistoryRow['chip'] {
    return GENERIC_CHIP[status] ?? { label: status, variant: 'secondary' };
}

function buildRows(
    jobs: MySubmissionItem[],
    community: MyContributionsResult | null,
    resources: MyResourcesResult | null
): HistoryRow[] {
    const rows: HistoryRow[] = [];

    for (const item of jobs) {
        const mergedHref = item.viewState === 'MERGED' && item.mergedTargetSlug
            ? `/jobs/${item.mergedTargetSlug}`
            : null;
        rows.push({
            key: `job-${item.id}`,
            kind: 'Job',
            title: item.company ? `${item.title} · ${item.company}` : item.title,
            subtitle: item.sourceLink,
            detail: null,
            createdAt: item.createdAt,
            chip: STATE_CHIP[item.viewState],
            href: item.viewState === 'LIVE' && item.slug ? `/jobs/${item.slug}` : mergedHref,
            hrefLabel: mergedHref ? 'Open' : 'View listing',
            notice:
                item.viewState === 'REJECTED' && item.rejectionReason
                    ? `Reason: ${item.rejectionReason}`
                    : item.viewState === 'MERGED'
                      ? 'Matched to existing listing'
                      : null,
            noticeTone: item.viewState === 'MERGED' ? 'muted' : 'danger',
            resubmitSource: item.viewState === 'REJECTED' ? item.sourceLink : null,
        });
    }

    // Community posts are withheld while community is paused. These are the only
    // rows that link into `/community/<id>`, so they are the only ones that let
    // a paused surface be reached from a page that is still very much live.
    // Interview experiences and application updates stay: they are
    // `InterviewExperience` / application-timeline records that link to the job
    // listing, not to a room or a discussion. See COMMUNITY_UI_ENABLED.
    if (COMMUNITY_UI_ENABLED) {
        for (const post of community?.posts ?? []) {
            rows.push({
                key: `post-${post.id}`,
                kind: post.category === 'HIRING_UPDATE' ? 'Hiring update' : 'Post',
                title: post.title,
                subtitle: null,
                detail: null,
                createdAt: post.createdAt,
                chip: chipFor(post.status),
                href: `/community/${post.id}`,
                hrefLabel: 'View post',
                notice: null,
                noticeTone: 'muted',
                resubmitSource: null,
            });
        }
    }

    for (const iex of community?.interviews ?? []) {
        rows.push({
            key: `iex-${iex.id}`,
            kind: 'Interview',
            title: iex.opportunity ? `${iex.role} · ${iex.opportunity.title}` : iex.role,
            subtitle: null,
            detail: null,
            createdAt: iex.createdAt,
            chip: chipFor(iex.moderationStatus),
            href: iex.opportunity ? `/jobs/${iex.opportunity.slug}` : null,
            hrefLabel: 'View job',
            notice: null,
            noticeTone: 'muted',
            resubmitSource: null,
        });
    }

    for (const update of community?.updates ?? []) {
        rows.push({
            key: `update-${update.id}`,
            kind: 'Application update',
            title: update.opportunity
                ? `${update.updateStatus} · ${update.opportunity.title}`
                : update.updateStatus,
            subtitle: update.description,
            detail: null,
            createdAt: update.createdAt,
            chip: { label: 'Live', variant: 'success' },
            href: update.opportunity ? `/jobs/${update.opportunity.slug}` : null,
            hrefLabel: 'View job',
            notice: null,
            noticeTone: 'muted',
            resubmitSource: null,
        });
    }

    for (const resource of resources?.resources ?? []) {
        rows.push({
            key: `resource-${resource.id}`,
            kind: 'Resource',
            title: resource.title,
            subtitle: `${resource.itemCount} ${resource.itemCount === 1 ? 'link' : 'links'}`,
            detail: null,
            createdAt: resource.createdAt,
            chip: chipFor(resource.status),
            href: resource.status === 'APPROVED' ? '/resources' : null,
            hrefLabel: 'View resources',
            notice: null,
            noticeTone: 'muted',
            resubmitSource: null,
        });
    }

    return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

export function ContributionHistory({ onContribute, refreshKey, onStatsChange, justSubmitted }: ContributionHistoryProps) {
    const { user } = useAuth();
    const [rows, setRows] = useState<HistoryRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [unavailable, setUnavailable] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<HistoryFilter>('ALL');

    // Optimistic insert: snapshot the rows identity the moment `justSubmitted`
    // arrives. The card shows only while `rows` is still that snapshot — the
    // next successful `setRows` (new array) hides it, so a fast refetch that
    // already contains the real row never duplicates. Distinct key
    // `just-submitted` below keeps React from reconciling it with real rows.
    const normalizedSubmitted = justSubmitted ?? null;
    const baselineRef = useRef<{ submitted: { title: string; kind: string } | null; rows: HistoryRow[] | null } | undefined>(undefined);
    if (baselineRef.current?.submitted !== normalizedSubmitted) {
        baselineRef.current = { submitted: normalizedSubmitted, rows };
    }
    const optimisticActive = !!normalizedSubmitted && baselineRef.current?.rows === rows && !error;

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        setSessionExpired(false);
        setUnavailable([]);
        try {
            // Only the job list is load-bearing. The other two are additive:
            // a failure there must degrade to a note, never blank the list.
            const [jobs, communityResult, resourcesResult] = await Promise.all([
                communityApi.listMySubmissions(),
                communityApi.listMyContributions().then(
                    (value) => ({ ok: true as const, value }),
                    () => ({ ok: false as const, value: null }),
                ),
                resourcesApi.listMine().then(
                    (value) => ({ ok: true as const, value }),
                    () => ({ ok: false as const, value: null }),
                ),
            ]);

            const missing: string[] = [];
            if (!communityResult.ok) missing.push('community posts and interview experiences');
            if (!resourcesResult.ok) missing.push('resources');

            setRows(buildRows(jobs.submissions, communityResult.value, resourcesResult.value));
            setUnavailable(missing);
        } catch (e) {
            // A rejected primary means the session is gone (401) or the
            // endpoint is down — prompt to sign in instead of a red error.
            if (e instanceof UnauthorizedError || (e as { statusCode?: number })?.statusCode === 401) {
                setSessionExpired(true);
                return;
            }
            setError('Could not load your submissions.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    useEffect(() => {
        if (rows) onStatsChange?.(getHistoryStats(rows));
    }, [rows, onStatsChange]);

    if (!user || sessionExpired) {
        return (
            <EmptyState
                title="Sign in to track your submissions"
                description=""
                icon="inbox"
                action={
                    sessionExpired ? (
                        <Button asChild>
                            <Link href="/login?redirect=%2Fcontribute">Sign in</Link>
                        </Button>
                    ) : (
                        <Button onClick={onContribute}>Contribute something</Button>
                    )
                }
            />
        );
    }

    if (loading && rows === null) {
        return (
            <div className="space-y-3">
                {optimisticActive && normalizedSubmitted ? (
                    <div
                        key="just-submitted"
                        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="warning">Pending</Badge>
                                <span className="text-xs font-semibold text-muted-foreground">{normalizedSubmitted.kind}</span>
                                <span className="text-xs text-muted-foreground">Just now</span>
                            </div>
                            <p className="break-words text-sm font-semibold text-foreground">{normalizedSubmitted.title}</p>
                            <p className="text-xs text-muted-foreground">Waiting for moderator review.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">In review</span>
                        </div>
                    </div>
                ) : null}
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={() => void load()} />;
    }

    const partialNote =
        unavailable.length > 0
            ? `Couldn't load your ${unavailable.join(' or ')} right now — everything else is shown below.`
            : null;

    if (!rows || rows.length === 0) {
        if (optimisticActive && normalizedSubmitted) {
            return (
                <div className="space-y-4">
                    {partialNote && (
                        <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{partialNote}</p>
                    )}
                    <ul className="space-y-3">
                        <li
                            key="just-submitted"
                            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="warning">Pending</Badge>
                                    <span className="text-xs font-semibold text-muted-foreground">{normalizedSubmitted.kind}</span>
                                    <span className="text-xs text-muted-foreground">Just now</span>
                                </div>
                                <p className="break-words text-sm font-semibold text-foreground">{normalizedSubmitted.title}</p>
                                <p className="text-xs text-muted-foreground">Waiting for moderator review.</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <span className="text-xs text-muted-foreground">In review</span>
                            </div>
                        </li>
                    </ul>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {partialNote && (
                    <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{partialNote}</p>
                )}
                <EmptyState
                    title="Nothing shared yet"
                    description="Share a job, a walk-in drive, your interview experience, a hiring update, or a useful resource. Everything you share shows up here with its status."
                    icon="inbox"
                    action={onContribute ? <Button onClick={onContribute}>Contribute something</Button> : undefined}
                />
            </div>
        );
    }

    const stats = getHistoryStats(rows);
    const counts: Record<HistoryFilter, number> = {
        ALL: rows.length,
        PENDING: stats.pending,
        LIVE: stats.live,
        REJECTED: stats.needsAttention,
    };
    const visibleRows = filterHistoryRows(rows, filter);

    return (
        <div className="space-y-4">
            {partialNote && (
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{partialNote}</p>
            )}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter contributions by status">
                {FILTERS.map((option) => {
                    const active = filter === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setFilter(option.value)}
                            className={
                                active
                                    ? 'rounded-full bg-surface-active px-3 py-1.5 text-xs font-semibold text-surface-active-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                                    : 'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted'
                            }
                        >
                            {option.label} · {counts[option.value]}
                        </button>
                    );
                })}
                <span className="ml-auto text-xs text-muted-foreground">Latest first</span>
            </div>
            {visibleRows.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                    {filter === 'ALL'
                        ? 'Nothing here yet.'
                        : `No ${FILTERS.find((option) => option.value === filter)?.label.toLowerCase()} contributions yet.`}
                </p>
            ) : (
                <ul className="space-y-3">
                    {optimisticActive && normalizedSubmitted && (filter === 'ALL' || filter === 'PENDING') ? (
                        <li
                            key="just-submitted"
                            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="warning">Pending</Badge>
                                    <span className="text-xs font-semibold text-muted-foreground">{normalizedSubmitted.kind}</span>
                                    <span className="text-xs text-muted-foreground">Just now</span>
                                </div>
                                <p className="break-words text-sm font-semibold text-foreground">{normalizedSubmitted.title}</p>
                                <p className="text-xs text-muted-foreground">Waiting for moderator review.</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <span className="text-xs text-muted-foreground">In review</span>
                            </div>
                        </li>
                    ) : null}
                    {visibleRows.map((row) => {
                        const pendingLine = row.chip.label === 'Pending' && !row.notice
                            ? 'Waiting for moderator review.'
                            : null;
                        return (
                            <li
                                key={row.key}
                                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={row.chip.variant}>{row.chip.label}</Badge>
                                        <span className="text-xs font-semibold text-muted-foreground">{row.kind}</span>
                                        <span className="text-xs text-muted-foreground">{formatWhen(row.createdAt)}</span>
                                    </div>
                                    <p className="break-words text-sm font-semibold text-foreground">{row.title}</p>
                                    {row.subtitle ? (
                                        <p className="break-words text-xs text-muted-foreground">{row.subtitle}</p>
                                    ) : null}
                                    {pendingLine ? (
                                        <p className="text-xs text-muted-foreground">{pendingLine}</p>
                                    ) : null}

                                    {row.notice ? (
                                        <p
                                            className={
                                                row.noticeTone === 'muted'
                                                    ? 'text-xs text-muted-foreground'
                                                    : 'rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive'
                                            }
                                        >
                                            {row.notice}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                    {row.href ? (
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={row.href}>{row.hrefLabel ?? 'View'}</Link>
                                        </Button>
                                    ) : null}
                                    {row.resubmitSource ? (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={`/contribute?type=JOB&source=${encodeURIComponent(row.resubmitSource)}`}>Resubmit</a>
                                        </Button>
                                    ) : null}
                                    {!row.href && !row.resubmitSource ? (
                                        <span className="text-xs text-muted-foreground">In review</span>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export type { MySubmissionsResult } from '@fresherflow/types';
