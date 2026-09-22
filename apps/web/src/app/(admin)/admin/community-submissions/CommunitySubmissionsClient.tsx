'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { cn } from "@/ui/cn";

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

export default function AdminCommunitySubmissionsPage() {
    const [status, setStatus] = useState<ReviewStatus>('PENDING_REVIEW');
    const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

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

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
                    ))}
                </div>
            ) : submissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    Nothing here. {status === 'PENDING_REVIEW' ? 'The review queue is clear.' : ''}
                </div>
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
            )}
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
