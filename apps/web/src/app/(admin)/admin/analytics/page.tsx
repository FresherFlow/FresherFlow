'use client';

import { useCallback, useEffect, useState, ReactNode } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminAnalyticsSkeleton } from '@/components/ui/Skeleton';

type MetricsV2 = {
    generatedAt: string;
    cacheTtlSeconds: number;
    linkHealth: {
        healthy: number;
        retrying: number;
        broken: number;
        percentage: number;
    };
    channelAttribution: {
        telegram: number;
        whatsapp: number;
        linkedin: number;
        others: number;
    };
    traffic: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningRate7d: number;
    };
};

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<MetricsV2 | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.getSystemMetricsV2('30d');
            setMetrics(response as MetricsV2);
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) return <AdminAnalyticsSkeleton />;

    if (!metrics) {
        return (
            <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Analytics unavailable.</p>
                {error && <p className="mt-1 text-xs text-amber-600">{error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
                <p className="text-sm text-muted-foreground">
                    Canonical metrics (cached {metrics.cacheTtlSeconds}s), updated {new Date(metrics.generatedAt).toLocaleString()}.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <MetricCard label="Link health" value={`${metrics.linkHealth.percentage}%`} hint={`${metrics.linkHealth.healthy} healthy`} />
                <MetricCard label="Applications (30d)" value={String(metrics.traffic.applications30d)} />
                <MetricCard label="New users (30d)" value={String(metrics.traffic.newUsers30d)} />
                <MetricCard label="Bookmarks (7d)" value={String(metrics.traffic.bookmarks7d)} />
                <MetricCard label="DAU" value={String(metrics.traffic.dau)} />
                <MetricCard label="WAU" value={String(metrics.traffic.wau)} hint={`Returning ${metrics.traffic.returningRate7d}%`} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Panel title="Link health distribution">
                    <Row label="Healthy" value={metrics.linkHealth.healthy} />
                    <Row label="Retrying" value={metrics.linkHealth.retrying} />
                    <Row label="Broken" value={metrics.linkHealth.broken} />
                </Panel>
                <Panel title="Channel attribution (apply clicks)">
                    <Row label="Telegram" value={metrics.channelAttribution.telegram} />
                    <Row label="WhatsApp" value={metrics.channelAttribution.whatsapp} />
                    <Row label="LinkedIn" value={metrics.channelAttribution.linkedin} />
                    <Row label="Others" value={metrics.channelAttribution.others} />
                </Panel>
            </div>
        </div>
    );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
