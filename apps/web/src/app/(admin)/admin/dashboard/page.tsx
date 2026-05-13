'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { adminApi } from '@/shared/api/admin';
import { AdminOverviewSkeleton } from '@/features/system/components/ui/Skeleton';
import { cn } from '@repo/ui/utils/cn';
import {
    ArrowPathIcon,
    BriefcaseIcon,
    ChartBarIcon,
    ClockIcon,
    SignalIcon,
} from '@heroicons/react/24/outline';

type GrowthWindow = '24h' | '7d' | '30d';

type MetricsV2 = {
    window: GrowthWindow;
    generatedAt: string;
    cacheTtlSeconds: number;
    listings: {
        live: number;
        published: number;
        drafts: number;
        expired: number;
        deleted: number;
        new24h: number;
        liveWalkins: number;
    };
    linkHealth: {
        healthy: number;
        retrying: number;
        broken: number;
        percentage: number;
    };
    traffic: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        requests: number;
        errorRatePct: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        topSlowRoutes: Array<{
            route: string;
            avgLatencyMs: number;
        }>;
        topErrorRoutes: Array<{
            route: string;
            errorRatePct: number;
            errors: number;
        }>;
    };
    funnel: {
        detailView: number;
        loginView: number;
        authSuccess: number;
        signupSuccess: number;
        applyClick: number;
        saveJob: number;
        detailToLoginPct: number;
        loginToAuthPct: number;
    };
    channelAttribution: {
        telegram: number;
        whatsapp: number;
        linkedin: number;
        others: number;
    };
    recentListings: Array<{
        id: string;
        title: string;
        company: string;
        type: string;
        postedAt: string;
    }>;
};

export default function AdminDashboardHome() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [windowValue, setWindowValue] = useState<GrowthWindow>('30d');
    const [metrics, setMetrics] = useState<MetricsV2 | null>(null);

    const loadDashboard = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setLoadError(null);
        try {
            const data = forceRefresh
                ? await adminApi.refreshSystemMetricsV2(windowValue)
                : await adminApi.getSystemMetricsV2(windowValue);
            const payload = (forceRefresh ? (data as { metrics: MetricsV2 }).metrics : data) as MetricsV2;
            setMetrics(payload);
        } catch (err: unknown) {
            const message = (err as Error).message || 'Failed to load dashboard';
            setLoadError(message);
            toast.error(`Failed to load dashboard: ${message}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [windowValue]);

    useEffect(() => {
        void loadDashboard(false);
    }, [loadDashboard]);

    if (loading) {
        return <AdminOverviewSkeleton />;
    }

    if (!metrics) {
        return (
            <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Dashboard data unavailable.</p>
                {loadError && <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>}
            </div>
        );
    }

    const statsCards = [
        { label: 'Live listings', value: metrics.listings.live, icon: BriefcaseIcon, color: 'text-blue-500' },
        { label: 'Live walk-ins', value: metrics.listings.liveWalkins, icon: BriefcaseIcon, color: 'text-purple-500' },
        { label: 'Drafts', value: metrics.listings.drafts, icon: ChartBarIcon, color: 'text-emerald-500' },
        { label: 'Expired', value: metrics.listings.expired, icon: ClockIcon, color: 'text-amber-500' },
        { label: 'Deleted', value: metrics.listings.deleted, icon: ClockIcon, color: 'text-rose-500' },
        { label: 'New (24h)', value: metrics.listings.new24h, icon: ClockIcon, color: 'text-amber-500' },
    ];

    return (
        <div className="space-y-6 pb-8 text-foreground">
            <header className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Admin overview</h1>
                        <p className="text-sm text-muted-foreground">
                            Canonical metrics snapshot. Generated {new Date(metrics.generatedAt).toLocaleString()}.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['24h', '7d', '30d'] as GrowthWindow[]).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setWindowValue(value)}
                                className={cn(
                                    'h-8 rounded-md border px-3 text-xs font-semibold capitalize tracking-wider',
                                    windowValue === value
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-card text-muted-foreground'
                                )}
                            >
                                {value}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => void loadDashboard(true)}
                            disabled={refreshing}
                            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold capitalize tracking-wider text-foreground"
                        >
                            <ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                            Refresh
                        </button>
                    </div>
                </div>
                {loadError && <p className="text-xs text-amber-600">{loadError}</p>}
            </header>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {statsCards.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                            <stat.icon className={cn('h-4 w-4', stat.color)} />
                        </div>
                        <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Link health actions</h3>
                    <Link href="/opportunities" className="text-xs font-medium text-primary hover:underline">
                        Manage listings
                    </Link>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link
                        href="/opportunities?status=PUBLISHED&linkHealth=RETRYING&activeOnly=true"
                        className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
                    >
                        <span>Retrying links (live)</span>
                        <span className="font-semibold">{metrics.linkHealth.retrying}</span>
                    </Link>
                    <Link
                        href="/opportunities?status=PUBLISHED&linkHealth=BROKEN&activeOnly=true"
                        className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 hover:bg-rose-100"
                    >
                        <span>Broken links (live)</span>
                        <span className="font-semibold">{metrics.linkHealth.broken}</span>
                    </Link>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    These shortcuts exclude archived, deleted, and expired listings.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Request health</h3>
                        <SignalIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] capitalize tracking-wider text-muted-foreground">Requests</p>
                            <p className="text-lg font-semibold">{metrics.traffic.requests}</p>
                        </div>
                        <div>
                            <p className="text-[10px] capitalize tracking-wider text-muted-foreground">Error rate</p>
                            <p className="text-lg font-semibold">{metrics.traffic.errorRatePct}%</p>
                        </div>
                        <div>
                            <p className="text-[10px] capitalize tracking-wider text-muted-foreground">Avg latency</p>
                            <p className="text-lg font-semibold">{metrics.traffic.avgLatencyMs} ms</p>
                        </div>
                        <div>
                            <p className="text-[10px] capitalize tracking-wider text-muted-foreground">P95 latency</p>
                            <p className="text-lg font-semibold">{metrics.traffic.p95LatencyMs} ms</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">Funnel ({windowValue})</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Detail views</span><span>{metrics.funnel.detailView}</span></div>
                        <div className="flex justify-between"><span>Login views</span><span>{metrics.funnel.loginView}</span></div>
                        <div className="flex justify-between"><span>Auth success</span><span>{metrics.funnel.authSuccess}</span></div>
                        <div className="flex justify-between"><span>Signup success</span><span>{metrics.funnel.signupSuccess}</span></div>
                        <div className="flex justify-between"><span>Apply clicks</span><span>{metrics.funnel.applyClick}</span></div>
                        <div className="flex justify-between"><span>Saved jobs</span><span>{metrics.funnel.saveJob}</span></div>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Recent listings</h3>
                    <Link href="/opportunities" className="text-xs font-medium text-primary hover:underline">
                        View all
                    </Link>
                </div>
                <div className="divide-y divide-border">
                    {metrics.recentListings.map((item) => (
                        <Link
                            key={item.id}
                            href={`/opportunities/edit/${item.id}`}
                            className="flex items-center justify-between py-2 hover:bg-muted/40"
                        >
                            <div className="min-w-0 pr-2">
                                <p className="truncate text-sm font-medium">{item.company}</p>
                                <p className="truncate text-xs text-muted-foreground">{item.title}</p>
                            </div>
                            <div className="text-right text-[11px] text-muted-foreground">
                                <p>{new Date(item.postedAt).toLocaleDateString()}</p>
                                <p>{item.type}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
