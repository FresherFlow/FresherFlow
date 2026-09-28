'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUturnLeftIcon,
    CheckIcon,
    EyeIcon,
    EyeSlashIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import type { Opportunity } from '@fresherflow/types';
import { apiClient } from '@/lib/api/client';
import { adminApi } from '@/lib/api/admin';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Input } from '@/ui/Input';
import { Skeleton } from '@/ui/Skeleton';

type ReviewStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'MERGED';

interface SubmissionExtra {
    guestName?: string;
    guestContact?: string;
    submittedVia?: string;
    withDetails?: boolean;
    rejectionReason?: string;
}

interface CommunitySubmission {
    id: string;
    sourceUrl: string;
    applyUrl: string | null;
    title: string;
    company: string | null;
    description: string | null;
    status: string;
    createdAt: string;
    extractedData: SubmissionExtra | null;
    opportunityId: string | null;
    submittedBy: {
        id: string;
        fullName: string | null;
        username: string | null;
        email: string | null;
    } | null;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
        status: string;
        deletedAt: string | null;
    } | null;
}

const FILTERS: { value: ReviewStatus; label: string }[] = [
    { value: 'PENDING_REVIEW', label: 'Pending' },
    { value: 'PUBLISHED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'MERGED', label: 'Merged' },
];

type QueueKind = 'jobs' | 'interview' | 'update' | 'hiring-post';
type ModStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

const QUEUE_TABS: { value: QueueKind; label: string }[] = [
    { value: 'jobs', label: 'Jobs' },
    { value: 'interview', label: 'Interviews' },
    { value: 'update', label: 'Updates' },
    { value: 'hiring-post', label: 'Hiring posts' },
];

const MOD_STATUSES: { value: ModStatus; label: string }[] = [
    { value: 'ACTIVE', label: 'Live' },
    { value: 'ARCHIVED', label: 'Removed' },
    { value: 'DELETED', label: 'Deleted' },
];

interface ModerationItem {
    id: string;
    status: string;
    createdAt: string;
    title?: string | null;
    body?: string | null;
    role?: string | null;
    difficulty?: string | null;
    result?: string | null;
    description?: string | null;
    author: { id: string; fullName: string | null; username: string | null } | null;
    opportunity?: { id: string; slug: string; title: string; company: string } | null;
}

function modAuthorLabel(item: ModerationItem): string {
    const user = item.author;
    if (!user) return 'Unknown';
    return user.username ? `@${user.username}` : (user.fullName ?? 'Unknown');
}

function submitterLabel(submission: CommunitySubmission): string {
    const guest = submission.extractedData?.guestName;
    if (guest) {
        const contact = submission.extractedData?.guestContact;
        return contact ? `${guest} (guest · ${contact})` : `${guest} (guest)`;
    }
    const user = submission.submittedBy;
    if (!user) return 'Unknown';
    return user.username ? `@${user.username}` : (user.fullName ?? user.email ?? 'Unknown');
}

function sourceBadgeLabel(submittedVia?: string): 'MCP' | 'Guest' | null {
    if (submittedVia === 'mcp') return 'MCP';
    if (submittedVia === 'community_guest') return 'Guest';
    return null;
}

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

/**
 * Noun for the currently selected queue, used in the inline confirmation copy.
 */
function queueNoun(kind: QueueKind): string {
    if (kind === 'interview') return 'interview experience';
    if (kind === 'hiring-post') return 'hiring post';
    return 'update';
}

/** Short purpose line for the page. */
const PAGE_DESCRIPTION = 'Shares from the contribute flow. Nothing goes live until it is approved here.';

export default function AdminCommunitySubmissionsPage({ initialQueue = 'jobs' }: { initialQueue?: QueueKind } = {}) {
    const [status, setStatus] = useState<ReviewStatus>('PENDING_REVIEW');
    const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    /* Reason + confirm/cancel stay inline under the row they apply to, exactly
       as before: the destructive step is unchanged in substance, only in
       primitives. `AlertDialog` was evaluated and rejected — see the note on
       the inline panel below. */
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [queueKind, setQueueKind] = useState<QueueKind>(initialQueue);
    const [modStatus, setModStatus] = useState<ModStatus>('ACTIVE');
    const [modItems, setModItems] = useState<ModerationItem[]>([]);
    const [modTotal, setModTotal] = useState(0);
    const [modLoading, setModLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [previewSubmission, setPreviewSubmission] = useState<CommunitySubmission | null>(null);

    const visibleSubmissions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return submissions;
        return submissions.filter((submission) =>
            submission.title.toLowerCase().includes(query) ||
            (submission.company ?? '').toLowerCase().includes(query) ||
            submission.sourceUrl.toLowerCase().includes(query)
        );
    }, [submissions, search]);

    const load = useCallback(async (nextStatus: ReviewStatus) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiClient<{ submissions: CommunitySubmission[]; pendingCount: number }>(
                `/api/admin/opportunities/community-submissions?status=${encodeURIComponent(nextStatus)}`
            );
            setSubmissions(result.submissions ?? []);
            setPendingCount(result.pendingCount ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load community submissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(status);
    }, [load, status]);

    const loadMod = useCallback(async (kind: QueueKind, nextStatus: ModStatus) => {
        if (kind === 'jobs') return;
        setModLoading(true);
        setError(null);
        try {
            const result = await apiClient<{ items: ModerationItem[]; total: number }>(
                `/api/admin/community/moderation-queue?kind=${encodeURIComponent(kind)}&status=${encodeURIComponent(nextStatus)}`
            );
            setModItems(result.items ?? []);
            setModTotal(result.total ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load moderation queue.');
        } finally {
            setModLoading(false);
        }
    }, []);

    useEffect(() => {
        if (queueKind !== 'jobs') void loadMod(queueKind, modStatus);
    }, [loadMod, queueKind, modStatus]);

    const decideMod = useCallback(
        async (item: ModerationItem, action: 'remove' | 'restore' | 'delete', reason?: string) => {
            setBusyId(item.id);
            setError(null);
            try {
                const base =
                    queueKind === 'interview'
                        ? `/api/admin/community/interviews/${encodeURIComponent(item.id)}`
                        : queueKind === 'hiring-post'
                          ? `/api/admin/community/posts/${encodeURIComponent(item.id)}`
                          : `/api/admin/community/updates/${encodeURIComponent(item.id)}`;
                // Canonical paths mirror packages/api-client/src/admin/community.ts:
                // spamInterview/spamPost use POST :id/spam, restorePost uses POST :id/restore.
                const url = action === 'delete' ? base : action === 'remove' ? `${base}/spam` : `${base}/restore`;
                await apiClient(url, {
                    method: action === 'delete' ? 'DELETE' : 'POST',
                    body: JSON.stringify(reason ? { reason } : {}),
                });
                setRejectingId(null);
                setRejectReason('');
                await loadMod(queueKind, modStatus);
            } catch (e) {
                setError(e instanceof Error ? e.message : `Failed to ${action} this item.`);
            } finally {
                setBusyId(null);
            }
        },
        [loadMod, queueKind, modStatus]
    );

    const decide = useCallback(
        async (submission: CommunitySubmission, action: 'approve' | 'reject', reason?: string) => {
            setBusyId(submission.id);
            setError(null);
            try {
                await apiClient(
                    `/api/admin/opportunities/community-submissions/${encodeURIComponent(submission.id)}/${action}`,
                    {
                        method: 'POST',
                        body: JSON.stringify(reason ? { reason } : {}),
                    }
                );
                setRejectingId(null);
                setRejectReason('');
                await load(status);
            } catch (e) {
                setError(e instanceof Error ? e.message : `Failed to ${action} this submission.`);
            } finally {
                setBusyId(null);
            }
        },
        [load, status]
    );

    /** Retry whichever loader the visible queue uses. */
    const retry = useCallback(() => {
        if (queueKind === 'jobs') {
            void load(status);
        } else {
            void loadMod(queueKind, modStatus);
        }
    }, [load, loadMod, queueKind, status, modStatus]);

    /** A background refetch with rows already on screen, so the operator knows
     *  the list is live without the rows disappearing under them. */
    const refreshing =
        queueKind === 'jobs' ? loading && submissions.length > 0 : modLoading && modItems.length > 0;

    return (
        // `flex-1 min-h-0 overflow-y-auto` is load-bearing: the admin shell
        // clips its content column, so a page without its own scroll container
        // cannot be scrolled and the bottom of the queue is unreachable.
        // `min-h-0` is what lets this flex child shrink far enough for
        // `overflow-y-auto` to engage at all — with only `flex-1` the child
        // never shrinks, its own scroller stays inert, and the shell's
        // `overflow-hidden` silently cuts the last rows.
        //
        // No page-level top padding: AdminLayoutClient already reserves the
        // mobile top offset with `pt-14 md:pt-18 lg:pt-0` on the content column.
        // `pb-20` clears the fixed AdminBottomNav, which does render on this
        // path and is `md:hidden`, so `md:p-8` — which includes the bottom edge —
        // takes over from there. No `mx-auto max-w-*` either: the shell already
        // constrains the column to `max-w-7xl`.
        //
        // The `h1` is `sr-only` below `lg`: `MobileTopNav` prints the route name
        // on a phone and `TopHeaderBar` prints it at `lg+`, so this heading made
        // the page name appear twice on mobile. It stays in the document so the
        // page still has a heading for screen readers. The description is body
        // copy, so it is `text-base` — the same step already taken on
        // /admin/users and /admin/audit.
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 text-foreground md:p-8">
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight text-foreground">
                        Community submissions
                    </h1>
                    <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {pendingCount > 0 ? (
                        <Badge variant="warning" size="sm" aria-live="polite">
                            {pendingCount} pending
                        </Badge>
                    ) : null}
                    {refreshing ? (
                        <Badge variant="muted" size="sm" aria-live="polite">
                            Updating…
                        </Badge>
                    ) : null}
                </div>
            </div>

            {/* `role="group"` + `aria-pressed`, not `role="tab"`: these chips
                switch the filter and have no tabpanel to control, so claiming
                the tab role was announcing a relationship that did not exist. */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Review queues">
                {QUEUE_TABS.map((tab) => (
                    <Button
                        key={tab.value}
                        type="button"
                        size="sm"
                        variant={queueKind === tab.value ? 'default' : 'outline'}
                        aria-pressed={queueKind === tab.value}
                        onClick={() => setQueueKind(tab.value)}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            {queueKind === 'jobs' ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter submissions by review status">
                    {FILTERS.map((filter) => (
                        <Button
                            key={filter.value}
                            type="button"
                            size="sm"
                            variant={status === filter.value ? 'default' : 'outline'}
                            aria-pressed={status === filter.value}
                            onClick={() => setStatus(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter items by status">
                    {MOD_STATUSES.map((filter) => (
                        <Button
                            key={filter.value}
                            type="button"
                            size="sm"
                            variant={modStatus === filter.value ? 'default' : 'outline'}
                            aria-pressed={modStatus === filter.value}
                            onClick={() => setModStatus(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                    {modTotal > 0 ? (
                        <Badge variant="secondary" size="sm">
                            {modTotal} in this view
                        </Badge>
                    ) : null}
                </div>
            )}

            {error ? (
                <ErrorMessage
                    className="shrink-0"
                    message={error}
                    onRetry={retry}
                    variant="subtle"
                />
            ) : null}

            {queueKind === 'jobs' ? (
                loading ? (
                    <div className="space-y-2" aria-hidden="true">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-3/5" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, company or URL…"
                            variant="search"
                            aria-label="Search submissions"
                            className="h-9 w-full sm:w-72"
                        />
                        {visibleSubmissions.length === 0 ? (
                            search.trim() !== '' ? (
                                <EmptyState
                                    title="No matching submissions"
                                    description="Nothing here matches your search."
                                    icon="search"
                                    size="md"
                                    variant="ghost"
                                    action={
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSearch('')}
                                        >
                                            Clear search
                                        </Button>
                                    }
                                />
                            ) : (
                                <EmptyState
                                    title="Nothing here"
                                    description={
                                        status === 'PENDING_REVIEW'
                                            ? 'The review queue is clear.'
                                            : 'No submissions in this view yet.'
                                    }
                                    icon="inbox"
                                    size="md"
                                    variant="ghost"
                                />
                            )
                        ) : (
                            <ul className="space-y-3">
                                {visibleSubmissions.map((submission) => (
                                    <li key={submission.id}>
                                        <SubmissionRow
                                            submission={submission}
                                            busy={busyId === submission.id}
                                            rejecting={rejectingId === submission.id}
                                            rejectReason={rejectReason}
                                            onStartReject={() => {
                                                setRejectingId(submission.id);
                                                setRejectReason('');
                                            }}
                                            onCancelReject={() => setRejectingId(null)}
                                            onRejectReasonChange={setRejectReason}
                                            onApprove={() => void decide(submission, 'approve')}
                                            onReject={() => void decide(submission, 'reject', rejectReason.trim() || undefined)}
                                            onPreview={() => setPreviewSubmission(submission)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )
            ) : modLoading ? (
                <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                </div>
            ) : modItems.length === 0 ? (
                <EmptyState
                    title="Nothing here"
                    description={modStatus === 'ACTIVE' ? 'The review queue is clear.' : 'No items in this view yet.'}
                    icon="inbox"
                    size="md"
                    variant="ghost"
                />
            ) : (
                <ul className="space-y-3">
                    {modItems.map((item) => (
                        <li key={item.id}>
                            <ModerationRow
                                item={item}
                                kind={queueKind}
                                busy={busyId === item.id}
                                rejecting={rejectingId === item.id}
                                rejectReason={rejectReason}
                                onStartReject={() => {
                                    setRejectingId(item.id);
                                    setRejectReason('');
                                }}
                                onCancelReject={() => setRejectingId(null)}
                                onRejectReasonChange={setRejectReason}
                                onRemove={() => void decideMod(item, 'remove', rejectReason.trim() || undefined)}
                                onRestore={() => void decideMod(item, 'restore')}
                                onDelete={() => void decideMod(item, 'delete')}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <SubmissionPreviewModal
                submission={previewSubmission}
                onClose={() => setPreviewSubmission(null)}
            />
        </div>
    );
}

/**
 * One already-published community item. The action set depends on the queue and
 * the current status; every destructive action expands the same optional-reason
 * confirmation under the row.
 *
 * The reason step stayed inline rather than moving into `AlertDialog`: the
 * primitive only forwards a reason to `onConfirm` when `requireReason` is set,
 * and `requireReason` also disables the confirm button until text is typed
 * (`ui/AlertDialog.tsx`). Adopting it would make the reason mandatory and block
 * a reasonless reject/removal the API still accepts, i.e. a behaviour change.
 */
function ModerationRow({
    item,
    kind,
    busy,
    rejecting,
    rejectReason,
    onStartReject,
    onCancelReject,
    onRejectReasonChange,
    onRemove,
    onRestore,
    onDelete,
}: {
    item: ModerationItem;
    kind: QueueKind;
    busy: boolean;
    rejecting: boolean;
    rejectReason: string;
    onStartReject: () => void;
    onCancelReject: () => void;
    onRejectReasonChange: (value: string) => void;
    onRemove: () => void;
    onRestore: () => void;
    onDelete: () => void;
}) {
    const isLive = item.status === 'ACTIVE';
    const isRemoved = item.status === 'ARCHIVED';
    const heading =
        kind === 'interview'
            ? (item.role ?? 'Interview experience')
            : (item.title ?? 'Untitled');
    const preview =
        kind === 'interview'
            ? [item.difficulty, item.result].filter(Boolean).join(' · ') || null
            : ((item.description ?? item.body ?? '').slice(0, 220) || null);

    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">{heading}</h3>
                        <p className="truncate text-xs text-muted-foreground">
                            {modAuthorLabel(item)} · {formatWhen(item.createdAt)}
                            {item.opportunity ? ` · ${item.opportunity.title}` : null}
                        </p>
                        {preview ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {item.opportunity ? (
                            <Button asChild variant="ghost" size="sm">
                                <a href={`/jobs/${item.opportunity.slug}`}>View</a>
                            </Button>
                        ) : null}
                        {isLive && kind !== 'update' ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={onStartReject}
                            >
                                <EyeSlashIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                Remove
                            </Button>
                        ) : null}
                        {isRemoved ? (
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                disabled={busy}
                                onClick={onRestore}
                            >
                                <ArrowUturnLeftIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                {busy ? 'Working…' : 'Restore'}
                            </Button>
                        ) : null}
                        {kind === 'update' && isLive ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                                onClick={onStartReject}
                            >
                                <TrashIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                Delete
                            </Button>
                        ) : null}
                    </div>
                </div>

                {rejecting ? (
                    <div className="space-y-2 border-t border-border pt-3">
                        <label htmlFor={`mod-${item.id}`} className="block text-xs font-semibold text-foreground">
                            {kind === 'update'
                                ? 'This permanently deletes the update. Reason (logged in audit)'
                                : `This hides the ${queueNoun(kind)} from the community. Reason (logged in audit)`}
                        </label>
                        <Input
                            id={`mod-${item.id}`}
                            value={rejectReason}
                            onChange={(e) => onRejectReasonChange(e.target.value)}
                            placeholder="e.g. Spam, abusive, or off-topic"
                            aria-label="Moderation reason"
                            disabled={busy}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant={kind === 'update' ? 'destructive' : 'default'}
                                size="sm"
                                disabled={busy}
                                onClick={kind === 'update' ? onDelete : onRemove}
                            >
                                {kind === 'update' ? 'Confirm delete' : 'Confirm remove'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={onCancelReject}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
/**
 * One community submission. Approve commits immediately; Reject expands the
 * same optional-reason confirmation the moderation rows use.
 */
function SubmissionRow({
    submission,
    busy,
    rejecting,
    rejectReason,
    onStartReject,
    onCancelReject,
    onRejectReasonChange,
    onApprove,
    onReject,
    onPreview,
}: {
    submission: CommunitySubmission;
    busy: boolean;
    rejecting: boolean;
    rejectReason: string;
    onStartReject: () => void;
    onCancelReject: () => void;
    onRejectReasonChange: (value: string) => void;
    onApprove: () => void;
    onReject: () => void;
    onPreview: () => void;
}) {
    const isPending = submission.status === 'PENDING_REVIEW';
    const rejectionReason = submission.extractedData?.rejectionReason;
    const sourceBadge = sourceBadgeLabel(submission.extractedData?.submittedVia);

    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{submission.title}</h3>
                            {submission.company ? (
                                <span className="text-xs text-muted-foreground">· {submission.company}</span>
                            ) : null}
                            {submission.extractedData?.withDetails ? (
                                <Badge variant="muted" size="sm">
                                    Details added
                                </Badge>
                            ) : null}
                            {sourceBadge ? (
                                <Badge variant="muted" size="sm">
                                    {sourceBadge}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                            {submitterLabel(submission)} · {formatWhen(submission.createdAt)}
                        </p>
                        <a
                            href={submission.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block truncate text-xs text-primary hover:underline"
                        >
                            {submission.sourceUrl}
                        </a>
                        {submission.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{submission.description}</p>
                        ) : null}
                        {submission.status === 'REJECTED' && rejectionReason ? (
                            <p className="rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">
                                Reason: {rejectionReason}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={onPreview}
                        >
                            <EyeIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                            Preview
                        </Button>
                        {submission.opportunity && submission.status === 'PUBLISHED' ? (
                            <Button asChild variant="ghost" size="sm">
                                <a href={`/jobs/${submission.opportunity.slug}`}>View</a>
                            </Button>
                        ) : null}
                        {isPending ? (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={busy}
                                    onClick={onApprove}
                                >
                                    <CheckIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                    {busy ? 'Working…' : 'Approve'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={onStartReject}
                                >
                                    <XMarkIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                                    Reject
                                </Button>
                            </>
                        ) : null}
                    </div>
                </div>

                {rejecting ? (
                    <div className="space-y-2 border-t border-border pt-3">
                        <label htmlFor={`reject-${submission.id}`} className="block text-xs font-semibold text-foreground">
                            Reason (shown to the contributor)
                        </label>
                        <Input
                            id={`reject-${submission.id}`}
                            value={rejectReason}
                            onChange={(e) => onRejectReasonChange(e.target.value)}
                            placeholder="e.g. Link is dead or the role is not entry-level"
                            aria-label="Rejection reason"
                            disabled={busy}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                                onClick={onReject}
                            >
                                Confirm reject
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={onCancelReject}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

function SubmissionPreviewModal({
    submission,
    onClose,
}: {
    submission: CommunitySubmission | null;
    onClose: () => void;
}) {
    const [opp, setOpp] = useState<Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const opportunityId = submission?.opportunityId ?? null;

    useEffect(() => {
        if (!submission || !opportunityId) {
            setOpp(null);
            setFetchError(null);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        const fetchDetails = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                // Same data access as AdminOpportunityPreviewModal (admin opportunity detail endpoint).
                const response = await adminApi.getOpportunity(opportunityId) as { opportunity: Opportunity };
                if (cancelled) return;
                if (response?.opportunity) {
                    setOpp(response.opportunity);
                } else {
                    throw new Error('Opportunity data not found');
                }
            } catch (err: unknown) {
                if (cancelled) return;
                setOpp(null);
                setFetchError(err instanceof Error ? err.message : 'Failed to load opportunity preview.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        void fetchDetails();
        return () => {
            cancelled = true;
        };
    }, [submission, opportunityId]);

    const sourceBadge = submission ? sourceBadgeLabel(submission.extractedData?.submittedVia) : null;
    const salaryText = opp
        ? (opp.stipend ||
            opp.salaryRange ||
            (opp.salaryMin != null || opp.salaryMax != null
                ? [opp.salaryMin ?? '', opp.salaryMax ?? ''].filter((v) => v !== '').join(' – ')
                : null) ||
            'Not specified')
        : null;
    const employmentText = opp
        ? [...(opp.employmentTypes ?? []), ...(opp.workMode ? [opp.workMode] : [])].join(', ') || 'Not specified'
        : null;
    const walkIn = opp?.walkInDetails ?? null;

    return (
        <Dialog open={submission !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            {/* `max-h-4/5` is the token equivalent of the old `max-h-[85vh]`:
                the dialog stays inside the viewport and scrolls internally. */}
            <DialogContent className="max-h-4/5 max-w-2xl overflow-y-auto">
                {submission ? (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{submission.title}</DialogTitle>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {submission.company ? (
                                    <span className="text-xs font-semibold text-foreground">{submission.company}</span>
                                ) : null}
                                {sourceBadge ? (
                                    <Badge variant="muted" size="sm">
                                        {sourceBadge}
                                    </Badge>
                                ) : null}
                                <span className="text-xs text-muted-foreground">{submitterLabel(submission)}</span>
                            </div>
                        </DialogHeader>

                        {isLoading ? (
                            <div className="space-y-2" aria-hidden="true">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        ) : opp ? (
                            <div className="space-y-4">
                                {opp.description ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{opp.description}</p>
                                ) : submission.description ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{submission.description}</p>
                                ) : null}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="rounded-xl border border-border bg-card p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Locations</p>
                                        <p className="mt-1 text-xs font-semibold text-foreground">
                                            {(opp.locations ?? []).length > 0 ? (opp.locations ?? []).join(', ') : 'Not specified'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary</p>
                                        <p className="mt-1 text-xs font-semibold text-foreground">{salaryText}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employment</p>
                                        <p className="mt-1 text-xs font-semibold text-foreground">{employmentText}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Eligibility</p>
                                        <p className="mt-1 text-xs font-semibold text-foreground">
                                            {[
                                                (opp.allowedDegrees ?? []).length > 0 ? `Degrees: ${(opp.allowedDegrees ?? []).join(', ')}` : null,
                                                (opp.allowedPassoutYears ?? []).length > 0 ? `Batch: ${[...(opp.allowedPassoutYears ?? [])].sort().join(', ')}` : null,
                                                (opp.requiredSkills ?? []).length > 0 ? `Skills: ${(opp.requiredSkills ?? []).join(', ')}` : null,
                                            ].filter(Boolean).join(' · ') || 'Not specified'}
                                        </p>
                                    </div>
                                </div>
                                {walkIn ? (
                                    <div className="rounded-xl border border-border bg-card p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Walk-in</p>
                                        <p className="mt-1 text-xs font-semibold text-foreground">
                                            {[
                                                (walkIn.dates ?? []).length > 0 ? (walkIn.dates ?? []).join(', ') : walkIn.dateRange ?? null,
                                                walkIn.timeRange ?? null,
                                            ].filter(Boolean).join(' · ') || 'Dates to be confirmed'}
                                        </p>
                                        {walkIn.venueAddress ? (
                                            <p className="mt-1 text-xs text-muted-foreground">{walkIn.venueAddress}</p>
                                        ) : null}
                                    </div>
                                ) : null}
                                <a
                                    href={opp.sourceLink ?? submission.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="block truncate text-xs text-primary hover:underline"
                                >
                                    {opp.sourceLink ?? submission.sourceUrl}
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {fetchError ? (
                                    <p className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                                        Full draft unavailable ({fetchError}); showing submitted fields.
                                    </p>
                                ) : (
                                    <p className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                                        Full draft unavailable for this submission; showing submitted fields.
                                    </p>
                                )}
                                {submission.company ? (
                                    <p className="text-xs font-semibold text-foreground">{submission.company}</p>
                                ) : null}
                                {submission.description ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{submission.description}</p>
                                ) : null}
                                <a
                                    href={submission.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="block truncate text-xs text-primary hover:underline"
                                >
                                    {submission.sourceUrl}
                                </a>
                            </div>
                        )}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
