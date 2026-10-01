'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
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

/**
 * The triage queue itself, with no page chrome.
 *
 * Mounted from three places — `/admin/reports` (which owns the page header),
 * the Reports tab of `/admin/dashboard` (which has its own h1) and
 * `/moderator/reports` (whose layout has one too) — so the heading and the
 * scroll container live at the route, not here. A background refetch also keeps
 * the rows already on screen instead of replacing the whole list with a
 * skeleton, which is why the loading state is a sibling branch and not an early
 * return.
 */
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

    return (
        <div className="space-y-4">
            {/* `role="group"` + `aria-pressed` rather than `role="tab"`: the
                chips filter one list in place and control no tabpanel, so the tab
                role announced a relationship that does not exist. */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter reports by status">
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
                        {filter.value === 'OPEN' && openCount > 0 ? ` (${openCount})` : ''}
                    </Button>
                ))}
                {/* A refetch with rows on screen keeps them; the badge is how the
                    operator knows the list is live. */}
                {loading && reports.length > 0 ? (
                    <Badge variant="muted" size="sm" aria-live="polite">
                        Updating…
                    </Badge>
                ) : null}
            </div>

            {error ? (
                <ErrorMessage
                    title="Could not load reports"
                    message={error}
                    onRetry={() => void fetchReports(status)}
                    variant="subtle"
                />
            ) : loading && reports.length === 0 ? (
                <div className="space-y-3" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="space-y-2 p-4">
                                <Skeleton variant="subtle" className="h-3 w-2/5" />
                                <Skeleton variant="subtle" className="h-3 w-4/5" />
                                <Skeleton variant="subtle" className="h-8 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
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
                        <li key={report.id}>
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="secondary" size="sm">
                                            {report.reason}
                                        </Badge>
                                        <span>{new Date(report.createdAt).toLocaleString('en-IN')}</span>
                                        <span>
                                            by{' '}
                                            {report.reporter?.username
                                                ? `@${report.reporter.username}`
                                                : (report.reporter?.fullName ?? report.reporter?.email ?? 'Unknown')}
                                        </span>
                                    </div>
                                    {report.message ? (
                                        <p className="text-sm text-foreground">{report.message}</p>
                                    ) : null}
                                    <div className="text-sm text-muted-foreground">
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
                                        {report.comment ? (
                                            <span className="block">Comment: {report.comment.text}</span>
                                        ) : null}
                                    </div>
                                    {status === 'OPEN' || status === 'REVIEWING' ? (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                disabled={actingId === report.id}
                                                onClick={() => void triage(report.id, 'resolve')}
                                            >
                                                Resolve
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={actingId === report.id}
                                                onClick={() => void triage(report.id, 'dismiss')}
                                            >
                                                Dismiss
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                disabled={actingId === report.id}
                                                onClick={() => void removeContent(report, false)}
                                            >
                                                Remove content + resolve
                                            </Button>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
