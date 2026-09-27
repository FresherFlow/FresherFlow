'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/Card';

type DispatchStatus = 'INITIATED' | 'SENT' | 'FAILED' | 'SKIPPED';

type StatusCount = {
    status: DispatchStatus;
    _count: { _all: number };
};

type DispatchTotalsResponse = {
    totals: {
        byStatus: StatusCount[];
        byReason: Array<{ reason: string | null; _count: { _all: number } }>;
    };
};

const STATUSES: DispatchStatus[] = ['INITIATED', 'SENT', 'FAILED', 'SKIPPED'];

/**
 * Compact notifications summary for the dashboard hub. Reuses the same
 * `adminApi.getAlertDispatchLogs` call shape as the full Alerts health page,
 * but renders only totals-by-status plus links out — no log table duplication.
 */
export function NotificationsSummary() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totals, setTotals] = useState<DispatchTotalsResponse['totals'] | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = (await adminApi.getAlertDispatchLogs({
                sinceHours: 24,
                limit: 200,
            })) as DispatchTotalsResponse;
            setTotals(res.totals ?? null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load alert dispatch totals');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const statusMap = useMemo(() => {
        const map = new Map<string, number>();
        (totals?.byStatus ?? []).forEach((row) => map.set(row.status, row._count._all));
        return map;
    }, [totals]);

    const total = useMemo(
        () => STATUSES.reduce((sum, status) => sum + (statusMap.get(status) ?? 0), 0),
        [statusMap],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                    Alert dispatch totals for the last 24 hours. Full delivery logs live under Alerts health.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {STATUSES.map((status) => (
                            <div key={status} className="rounded-lg border border-border p-3">
                                <div className="text-xs text-muted-foreground">{status}</div>
                                <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="space-y-3">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => void load()}>
                            Retry
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {STATUSES.map((status) => (
                            <div key={status} className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">{status}</div>
                                <div className="text-2xl font-bold">{statusMap.get(status) ?? 0}</div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && !error ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {total} dispatches in the last 24 hours.
                    </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/alerts">Open Alerts health</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/feedback">Open Feedback</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
