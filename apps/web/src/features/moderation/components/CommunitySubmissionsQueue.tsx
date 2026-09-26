'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { cn } from "@/ui/cn";
import { EmptyState } from '@/ui/EmptyState';
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

export default function AdminCommunitySubmissionsPage({ initialQueue = 'jobs' }: { initialQueue?: QueueKind } = {}) {
    const [status, setStatus] = useState<ReviewStatus>('PENDING_REVIEW');
    const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [queueKind, setQueueKind] = useState<QueueKind>(initialQueue);
    const [modStatus, setModStatus] = useState<ModStatus>('ACTIVE');
    const [modItems, setModItems] = useState<ModerationItem[]>([]);
    const [modTotal, setModTotal] = useState(0);
    const [modLoading, setModLoading] = useState(false);

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

    return (
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Community submissions</h1>
                    <p className="mt-1 text-muted-foreground">
                        Shares from the contribute flow. Nothing goes live until it is approved here.
                    </p>
                </div>
                {pendingCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-widest text-foreground">
                        {pendingCount} pending
                    </span>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review queues">
                {QUEUE_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={queueKind === tab.value}
                        onClick={() => setQueueKind(tab.value)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            queueKind === tab.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {queueKind === 'jobs' ? (
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => setStatus(filter.value)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            status === filter.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            ) : (
            <div className="flex flex-wrap items-center gap-2">
                {MOD_STATUSES.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => setModStatus(filter.value)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            modStatus === filter.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        {filter.label}
                    </button>
                ))}
                {modTotal > 0 ? (
                    <span className="text-xs text-muted-foreground">{modTotal} total</span>
                ) : null}
            </div>
            )}

            {error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-destructive">
                    {error}{' '}
                    <button
                        type="button"
                        onClick={() => void load(status)}
                        className="font-semibold text-primary hover:underline"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {queueKind === 'jobs' ? (
            loading ? (
                <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                </div>
            ) : submissions.length === 0 ? (
                <EmptyState
                    title="Nothing here"
                    description={status === 'PENDING_REVIEW' ? 'The review queue is clear.' : 'No submissions in this view yet.'}
                    icon="inbox"
                    size="md"
                    variant="ghost"
                />
            ) : (
                <div className="space-y-2">
                    {submissions.map((submission) => (
                        <SubmissionRow
                            key={submission.id}
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
                        />
                    ))}
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
                <div className="space-y-2">
                    {modItems.map((item) => (
                        <ModerationRow
                            key={item.id}
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
                    ))}
                </div>
            )}
        </div>
    );
}

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
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-sm font-bold text-foreground">{heading}</h3>
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
                        <a
                            href={`/jobs/${item.opportunity.slug}`}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            View
                        </a>
                    ) : null}
                    {isLive && kind !== 'update' ? (
                        <button
                            type="button"
                            onClick={onStartReject}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-destructive disabled:opacity-50"
                        >
                            Remove
                        </button>
                    ) : null}
                    {isRemoved ? (
                        <button
                            type="button"
                            onClick={onRestore}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {busy ? 'Working…' : 'Restore'}
                        </button>
                    ) : null}
                    {kind === 'update' && isLive ? (
                        <button
                            type="button"
                            onClick={onStartReject}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-destructive disabled:opacity-50"
                        >
                            Delete
                        </button>
                    ) : null}
                </div>
            </div>

            {rejecting ? (
                <div className="space-y-2 border-t border-border pt-3">
                    <label htmlFor={`mod-${item.id}`} className="block text-xs font-semibold text-foreground">
                        {kind === 'update'
                            ? 'This permanently deletes the update. Reason (logged in audit)'
                            : 'Reason (logged in audit)'}
                    </label>
                    <input
                        id={`mod-${item.id}`}
                        value={rejectReason}
                        onChange={(e) => onRejectReasonChange(e.target.value)}
                        placeholder="e.g. Spam, abusive, or off-topic"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={kind === 'update' ? onDelete : onRemove}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {kind === 'update' ? 'Confirm delete' : 'Confirm remove'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancelReject}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
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
}) {
    const isPending = submission.status === 'PENDING_REVIEW';
    const rejectionReason = submission.extractedData?.rejectionReason;

    return (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-foreground">{submission.title}</h3>
                        {submission.company ? (
                            <span className="text-xs text-muted-foreground">· {submission.company}</span>
                        ) : null}
                        {submission.extractedData?.withDetails ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Details added
                            </span>
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
                    {submission.opportunity && submission.status === 'PUBLISHED' ? (
                        <a
                            href={`/jobs/${submission.opportunity.slug}`}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            View
                        </a>
                    ) : null}
                    {isPending ? (
                        <>
                            <button
                                type="button"
                                onClick={onApprove}
                                disabled={busy}
                                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                {busy ? 'Working…' : 'Approve'}
                            </button>
                            <button
                                type="button"
                                onClick={onStartReject}
                                disabled={busy}
                                className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-destructive disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {rejecting ? (
                <div className="space-y-2 border-t border-border pt-3">
                    <label htmlFor={`reject-${submission.id}`} className="block text-xs font-semibold text-foreground">
                        Reason (shown to the contributor)
                    </label>
                    <input
                        id={`reject-${submission.id}`}
                        value={rejectReason}
                        onChange={(e) => onRejectReasonChange(e.target.value)}
                        placeholder="e.g. Link is dead or the role is not entry-level"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onReject}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            Confirm reject
                        </button>
                        <button
                            type="button"
                            onClick={onCancelReject}
                            disabled={busy}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
