'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import {
    ChartBarIcon,
    ExclamationTriangleIcon,
    BookmarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    UsersIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { AdminAnalyticsSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AnalyticsOverview {
    linkHealth: {
        healthy: number;
        broken: number;
        retrying: number;
    };
    opportunityStatus: {
        published: number;
        draft: number;
        archived: number;
    };
    activity: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        signupViews30d: number;
        signupSuccess30d: number;
        signupConversionRate30d: number;
    };
    typeDistribution: Array<{ type: string; count: number }>;
    feedback: Record<string, number>;
    funnel: Record<string, number>;
    channelAttribution: {
        telegram: number;
        whatsapp: number;
        linkedin: number;
        others: number;
    };
    urgent: {
        closingSoon48h: number;
        brokenLinks: number;
    };
}

export default function AdminAnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const analyticsData = await adminApi.getAnalyticsOverview();
            setAnalytics(analyticsData as AnalyticsOverview);
        } catch (error) {
            const message = (error as Error)?.message || 'Failed to load analytics';
            setLoadError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    if (loading) {
        return <AdminAnalyticsSkeleton />;
    }

    if (!analytics) {
        return (
            <div className="max-w-7xl mx-auto p-8">
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                    <p className="text-muted-foreground text-sm">Failed to load analytics.</p>
                    {loadError && <p className="text-xs text-muted-foreground mt-2">{loadError}</p>}
                    <Button
                        variant="outline"
                        onClick={() => void loadAnalytics()}
                        className="mt-4 h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const totalLinks = analytics.linkHealth.healthy + analytics.linkHealth.broken + analytics.linkHealth.retrying;
    const healthPercentage = totalLinks > 0 ? Math.round((analytics.linkHealth.healthy / totalLinks) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 md:pb-20 px-2 md:px-4 pt-4 md:pt-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 py-4 border-b border-border/50">
                <div className="space-y-0.5 text-left">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Analytics
                    </h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Key metrics and system health
                    </p>
                </div>
            </div>

            {/* Urgent Alerts */}
            {(analytics.urgent.brokenLinks > 0 || analytics.urgent.closingSoon48h > 0) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-amber-600">Attention needed</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analytics.urgent.brokenLinks > 0 && (
                            <div className="text-xs">
                                <span className="font-bold">{analytics.urgent.brokenLinks}</span> broken links need review
                            </div>
                        )}
                        {analytics.urgent.closingSoon48h > 0 && (
                            <div className="text-xs">
                                <span className="font-bold">{analytics.urgent.closingSoon48h}</span> listings closing within 48h
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-6">
                {/* Link Health */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Link health</span>
                        <CheckCircleIcon className="w-3 h-3 md:w-4 h-4 text-success" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{healthPercentage}%</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">
                        {analytics.linkHealth.healthy} healthy
                    </p>
                </div>

                {/* Applications (30d) */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Applications</span>
                        <DocumentTextIcon className="w-3 h-3 md:w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{analytics.activity.applications30d}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Last 30 days</p>
                </div>

                {/* New Users */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">New Users</span>
                        <UsersIcon className="w-3 h-3 md:w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{analytics.activity.newUsers30d}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Last 30 days</p>
                </div>

                {/* Bookmarks (7d) */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Bookmarks</span>
                        <BookmarkIcon className="w-3 h-3 md:w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{analytics.activity.bookmarks7d}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Last 7 Days</p>
                </div>

                {/* DAU */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">DAU</span>
                        <UsersIcon className="w-3 h-3 md:w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{analytics.activity.dau}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Last 24h</p>
                </div>

                {/* WAU */}
                <div className="bg-card/50 rounded-xl border border-border/50 p-3 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">WAU</span>
                        <UsersIcon className="w-3 h-3 md:w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-lg md:text-2xl font-bold text-foreground leading-none">{analytics.activity.wau}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">
                        Returning {analytics.activity.returningRate7d}%
                    </p>
                </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4" />
                    Conversion Funnel (Last 30d)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Job Views', key: 'DETAIL_VIEW', color: 'bg-primary' },
                        { label: 'Apply Clicks', key: 'APPLY_CLICK', color: 'bg-accent' },
                        { label: 'Signup Views', key: 'SIGNUP_VIEW', color: 'bg-amber-500' },
                        { label: 'Signup Success', key: 'SIGNUP_SUCCESS', color: 'bg-success' },
                        { label: 'Saved Jobs', key: 'SAVE_JOB', color: 'bg-primary/60' },
                    ].map((step, idx, arr) => {
                        const count = analytics.funnel[step.key] || 0;
                        const prevStep = idx > 0 ? arr[idx - 1] : null;
                        const prevCount = prevStep ? (analytics.funnel[prevStep.key] || 0) : 0;
                        const rate = (idx > 0 && prevCount > 0) ? Math.round((count / prevCount) * 100) : null;

                        return (
                            <div key={step.key} className="space-y-2 relative">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{step.label}</span>
                                    {rate !== null && (
                                        <span className="text-[10px] font-bold text-success">{rate}% rate</span>
                                    )}
                                </div>
                                <div className="h-12 bg-muted/20 rounded-lg flex items-center px-3 border border-border/30 overflow-hidden relative">
                                    <div
                                        className={cn("absolute left-0 top-0 bottom-0 opacity-10", step.color)}
                                        style={{ width: '100%' }}
                                    />
                                    <span className="text-xl font-bold tracking-tighter relative z-10">{count.toLocaleString()}</span>
                                </div>
                                {idx < arr.length - 1 && (
                                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                                        <ChevronRightIcon className="w-4 h-4 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Link Health Breakdown */}
                <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4" />
                        Link health distribution
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-success" />
                                <span className="text-xs font-medium">Healthy</span>
                            </div>
                            <span className="text-sm font-bold">{analytics.linkHealth.healthy}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowPathIcon className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-medium">Retrying</span>
                            </div>
                            <span className="text-sm font-bold">{analytics.linkHealth.retrying}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <XCircleIcon className="w-4 h-4 text-destructive" />
                                <span className="text-xs font-medium">Broken</span>
                            </div>
                            <span className="text-sm font-bold">{analytics.linkHealth.broken}</span>
                        </div>
                    </div>
                </div>

                {/* Opportunity Status */}
                <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <BriefcaseIcon className="w-4 h-4" />
                        Listing status
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Published</span>
                            <span className="text-sm font-bold text-success">{analytics.opportunityStatus.published}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Draft</span>
                            <span className="text-sm font-bold text-amber-600">{analytics.opportunityStatus.draft}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Archived</span>
                            <span className="text-sm font-bold text-muted-foreground">{analytics.opportunityStatus.archived}</span>
                        </div>
                    </div>
                </div>

                {/* Type Distribution */}
                <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">Type distribution</h3>
                    <div className="space-y-3">
                        {analytics.typeDistribution.map(item => (
                            <div key={item.type} className="flex items-center justify-between">
                                <span className="text-xs font-medium capitalize">{item.type.toLowerCase()}</span>
                                <span className="text-sm font-bold">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feedback Summary */}
                <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">User feedback (30d)</h3>
                    <div className="space-y-3">
                        {Object.keys(analytics.feedback).length > 0 ? (
                            Object.entries(analytics.feedback).map(([reason, count]) => (
                                <div key={reason} className="flex items-center justify-between">
                                    <span className="text-xs font-medium">{reason.replace(/_/g, ' ')}</span>
                                    <span className="text-sm font-bold">{count}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground">No feedback this month</p>
                        )}
                    </div>
                </div>

                {/* Channel Attribution */}
                <div className="bg-card/30 rounded-xl border border-border/50 p-4 md:p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">Channel attribution (apply clicks)</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Telegram', value: analytics.channelAttribution.telegram },
                            { label: 'WhatsApp', value: analytics.channelAttribution.whatsapp },
                            { label: 'LinkedIn', value: analytics.channelAttribution.linkedin },
                            { label: 'Others', value: analytics.channelAttribution.others },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <span className="text-xs font-medium">{item.label}</span>
                                <span className="text-sm font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
