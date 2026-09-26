'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import toast from 'react-hot-toast';

type ReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

interface ReportItem {
    id: string;
    reason: string;
    message: string | null;
    status: ReportStatus;
    createdAt: string;
    opportunityId: string | null;
    commentId: string | null;
    reporter: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
    opportunity: { id: string; slug: string; title: string; company: string } | null;
    comment: { id: string; text: string; opportunityId: string } | null;
}

const FILTERS: { value: ReportStatus; label: string }[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'REVIEWING', label: 'Reviewing' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'DISMISSED', label: 'Dismissed' },
];

export default function ReportsClient({ auth }: { auth?: { isAuthenticated: boolean } } = {}) {
    const firebaseAuth = useFirebaseAdmin();
    const isAuthenticated = auth?.isAuthenticated ?? firebaseAuth.isAuthenticated;
    const [status, setStatus] = useState<ReportStatus>('OPEN');
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [openCount, setOpenCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);

    const fetchReports = useCallback(async (nextStatus: ReportStatus) => {
        setLoading(true);
        setError(null);
        try {
            const res = (await adminApi.getReports({ status: nextStatus, limit: 100 })) as {
                reports: ReportItem[];
                openCount: number;
            };
            setReports(res.reports || []);
            setOpenCount(res.openCount || 0);
        } catch {
            setError('Could not load the report queue. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        void fetchReports(status);
    }, [isAuthenticated, status, fetchReports]);

    async function triage(id: string, action: 'resolve' | 'dismiss') {
        setActingId(id);
        try {
            if (action === 'resolve') {
                await adminApi.resolveReport(id);
                toast.success('Report resolved');
            } else {
                await adminApi.dismissReport(id);
                toast.success('Report dismissed');
            }
            setReports((prev) => prev.filter((report) => report.id !== id));
            setOpenCount((prev) => Math.max(prev - (status === 'OPEN' ? 1 : 0), 0));
        } catch {
            toast.error('Triage failed. Please retry.');
        } finally {
            setActingId(null);
        }
    }

    async function removeContent(report: ReportItem, spam: boolean) {
        const reason = `Report ${report.id} (${report.reason})`;
        try {
            if (report.commentId) {
                await adminApi.adminDeleteJobComment(report.commentId, reason);
            } else if (report.opportunityId) {
                await adminApi.deleteOpportunity(report.opportunityId, reason);
            } else {
                toast.error('Report has no actionable target');
                return;
            }
            toast.success(spam ? 'Content flagged as spam' : 'Content removed');
            await triage(report.id, 'resolve');
        } catch {
            toast.error('Removal failed. Please retry.');
        }
    }

    if (loading) {
        return (
            <div className="space-y-2 pb-12" aria-hidden="true">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 text-foreground">
            <header className="flex flex-col gap-2 border-b border-border pb-5">
                <h1 className="text-2xl font-semibold tracking-tight">User reports</h1>
                <p className="text-sm text-muted-foreground">
                    Canonical Prisma-backed moderation queue ({openCount} open). The legacy
                    Firebase feedback view is not a moderation dependency — triage happens here.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setStatus(filter.value)}
                            className={`rounded-full border px-3 py-1 text-sm ${
                                status === filter.value
                                    ? 'border-primary bg-primary/10 font-semibold'
                                    : 'border-border text-muted-foreground'
                            }`}
                        >
                            {filter.label}
                            {filter.value === 'OPEN' && openCount > 0 ? ` (${openCount})` : ''}
                        </button>
                    ))}
                </div>
            </header>

            {error ? (
                <ErrorMessage
                    title="Could not load reports"
                    message={error}
                    onRetry={() => void fetchReports(status)}
                />
            ) : reports.length === 0 ? (
                <EmptyState
                    title={`No ${status.toLowerCase()} reports`}
                    description="New user reports from job pages and discussions will appear here."
                    icon="inbox"
                    size="md"
                    variant="ghost"
                />
            ) : (
                <ul className="space-y-3">
                    {reports.map((report) => (
                        <li key={report.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase tracking-wide">
                                    {report.reason}
                                </span>
                                <span>{new Date(report.createdAt).toLocaleString('en-IN')}</span>
                                <span>
                                    by{' '}
                                    {report.reporter?.username
                                        ? `@${report.reporter.username}`
                                        : (report.reporter?.fullName ?? report.reporter?.email ?? 'Unknown')}
                                </span>
                            </div>
                            {report.message ? <p className="mt-2 text-sm">{report.message}</p> : null}
                            <div className="mt-2 text-sm text-muted-foreground">
                                {report.opportunity ? (
                                    <span>
                                        Job:{' '}
                                        <Link
                                            href={`/jobs/${report.opportunity.slug}`}
                                            className="font-medium text-foreground underline"
                                        >
                                            {report.opportunity.title} · {report.opportunity.company}
                                        </Link>
                                    </span>
                                ) : null}
                                {report.comment ? <span className="block">Comment: {report.comment.text}</span> : null}
                            </div>
                            {(status === 'OPEN' || status === 'REVIEWING') && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={actingId === report.id}
                                        onClick={() => void triage(report.id, 'resolve')}
                                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                    >
                                        Resolve
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actingId === report.id}
                                        onClick={() => void triage(report.id, 'dismiss')}
                                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actingId === report.id}
                                        onClick={() => void removeContent(report, false)}
                                        className="rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive disabled:opacity-50"
                                    >
                                        Remove content + resolve
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
