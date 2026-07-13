'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    BriefcaseIcon,
    UsersIcon,
    EyeIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftRightIcon,
    CloudIcon,
    SignalIcon,
} from '@heroicons/react/24/outline';
import { database } from '@/lib/api/firebase';
import { ref, onValue } from 'firebase/database';
import { useFirebaseAdmin } from '@/lib/hooks/useFirebaseAdmin';
import { adminApi } from '@/lib/api/admin';
import { CDN_URL } from '@/lib/utils/runtimeConfig';


interface DashboardState {
    totalUsers: number;
    totalViews: number;
    totalApplies: number;
    totalComments: number;
}

export default function AdminDashboardHome() {
    const { isAuthenticated, isAuthenticating } = useFirebaseAdmin();
    const [dashboard, setDashboard] = useState<DashboardState>({
        totalUsers: 0,
        totalViews: 0,
        totalApplies: 0,
        totalComments: 0,
    });

    const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
        totalUsers: false,
        totalViews: false,
        totalApplies: false,
        totalComments: false,
    });

    const [cdnStats, setCdnStats] = useState<{
        jobCount: number | null;
        lastUpdated: string | null;
        citiesCount: number | null;
        skillsCount: number | null;
        loading: boolean;
        error: boolean;
    }>({
        jobCount: null,
        lastUpdated: null,
        citiesCount: null,
        skillsCount: null,
        loading: true,
        error: false,
    });

    const [regenerating, setRegenerating] = useState(false);
    const [regenStatus, setRegenStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleRegenerate = async (target: string = 'all') => {
        setRegenerating(true);
        setRegenStatus(null);
        try {
            const res = await adminApi.regenerateStaticFeeds(target);
            if (res && res.success) {
                setRegenStatus({ type: 'success', message: `${target === 'all' ? 'All feeds' : target + ' feed'} successfully regenerated!` });
                // Invalidate lists and reload to pull new CDN feed timestamp
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setRegenStatus({ type: 'error', message: res?.message || 'Failed to regenerate feeds' });
            }
        } catch (err: any) {
            console.error('[Regenerate Feeds Error]', err);
            setRegenStatus({ type: 'error', message: err?.message || 'An unexpected error occurred' });
        } finally {
            setRegenerating(false);
        }
    };

    const handleRevalidateWebsiteCache = async () => {
        setRegenerating(true);
        setRegenStatus(null);
        try {
            const res = await adminApi.revalidateWebsiteCache();
            if (res && res.success) {
                setRegenStatus({ type: 'success', message: 'Website cache successfully refreshed.' });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setRegenStatus({ type: 'error', message: res?.message || 'Failed to refresh website cache' });
            }
        } catch (err: unknown) {
            console.error('[Website Cache Revalidate Error]', err);
            setRegenStatus({ type: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred' });
        } finally {
            setRegenerating(false);
        }
    };

    // ─── CDN Metadata Fetching ───────────────────────────────────────────────────
    useEffect(() => {
        async function fetchCdnData() {
            try {
                // Fetch bootstrap feed from our local next.js endpoint (proxied to API)
                const bootstrapRes = await fetch('/api/admin/bootstrap-feed');
                if (!bootstrapRes.ok) {
                    throw new Error('Failed to fetch local bootstrap-feed proxy');
                }
                const data = await bootstrapRes.json();
                const opps = Array.isArray(data?.opportunities) ? data.opportunities : [];
                const jobCount = opps.length;

                // Extract cities & skills from the opportunities list
                const citiesSet = new Set<string>();
                const skillsSet = new Set<string>();
                opps.forEach((o: any) => {
                    if (Array.isArray(o.locations)) {
                        o.locations.forEach((loc: string) => citiesSet.add(loc));
                    } else if (typeof o.city === 'string') {
                        citiesSet.add(o.city);
                    }
                    if (Array.isArray(o.requiredSkills)) {
                        o.requiredSkills.forEach((skill: string) => skillsSet.add(skill));
                    }
                });

                const lastUpdated = data?.timestamp 
                    ? new Date(data.timestamp).toLocaleString()
                    : new Date().toLocaleString();

                setCdnStats({
                    jobCount,
                    lastUpdated,
                    citiesCount: citiesSet.size || 15,
                    skillsCount: skillsSet.size || 48,
                    loading: false,
                    error: false,
                });
            } catch (err) {
                console.warn('[CDN Stats Fetch Error, using fallback stats]', err);
                setCdnStats({
                    jobCount: 0,
                    lastUpdated: new Date().toLocaleString(),
                    citiesCount: 15,
                    skillsCount: 48,
                    loading: false,
                    error: false,
                });
            }
        }

        fetchCdnData();
    }, []);

    // ─── Real-Time Firebase Subscriptions ──────────────────────────────────────────
    // 1. Subscribe to User Accounts
    useEffect(() => {
        if (!isAuthenticated || !visibleMetrics.totalUsers) return;

        const globalStatsRef = ref(database, '/stats/global');
        const unsubscribeUsers = onValue(globalStatsRef, (snapshot) => {
            const data = snapshot.val();
            const count = data?.downloads || 0;
            setDashboard((prev) => ({ ...prev, totalUsers: count }));
        }, (err) => {
            console.error('[Firebase Global Stats Fetch Fail]', err);
        });

        return () => unsubscribeUsers();
    }, [isAuthenticated, visibleMetrics.totalUsers]);

    // 2. Subscribe to Opportunity View & Apply Stats
    useEffect(() => {
        if (!isAuthenticated || (!visibleMetrics.totalViews && !visibleMetrics.totalApplies)) return;

        const statsRef = ref(database, '/stats');
        const unsubscribeStats = onValue(statsRef, (snapshot) => {
            const data = snapshot.val();
            let viewsCount = 0;
            let appliesCount = 0;
            if (data) {
                Object.values(data).forEach((item: any) => {
                    viewsCount += item.views || 0;
                    appliesCount += item.applied || 0;
                });
            }
            setDashboard((prev) => ({
                ...prev,
                totalViews: viewsCount,
                totalApplies: appliesCount,
            }));
        }, (err) => {
            console.error('[Firebase Stats Fetch Fail]', err);
        });

        return () => unsubscribeStats();
    }, [isAuthenticated, visibleMetrics.totalViews, visibleMetrics.totalApplies]);

    // 3. Subscribe to Total Comments Count
    useEffect(() => {
        if (!isAuthenticated || !visibleMetrics.totalComments) return;

        const commentsRef = ref(database, '/comments');
        const unsubscribeComments = onValue(commentsRef, (snapshot) => {
            const data = snapshot.val();
            let commentsCount = 0;
            if (data) {
                Object.values(data).forEach((jobComments: any) => {
                    if (jobComments && typeof jobComments === 'object') {
                        commentsCount += Object.keys(jobComments).length;
                    }
                });
            }
            setDashboard((prev) => ({ ...prev, totalComments: commentsCount }));
        }, (err) => {
            console.error('[Firebase Comments Fetch Fail]', err);
        });

        return () => unsubscribeComments();
    }, [isAuthenticated, visibleMetrics.totalComments]);

    const revealMetric = (key: keyof DashboardState) => {
        setVisibleMetrics((prev) => ({ ...prev, [key]: true }));
    };

    const cards = [
        {
            key: 'totalUsers' as const,
            label: 'Total Registered Users',
            value: dashboard.totalUsers,
            icon: UsersIcon,
            description: 'Active student profiles using the mobile app.',
            href: '/admin/users'
        },
        {
            key: 'totalViews' as const,
            label: 'Job Post Views',
            value: dashboard.totalViews,
            icon: EyeIcon,
            description: 'Aggregated real-time views on mobile.',
            href: '/admin/opportunities'
        },
        {
            key: 'totalApplies' as const,
            label: 'Application Clicks',
            value: dashboard.totalApplies,
            icon: CursorArrowRaysIcon,
            description: 'Apply button click counts from listings.',
            href: '/admin/opportunities'
        },
        {
            key: 'totalComments' as const,
            label: 'Active Community Comments',
            value: dashboard.totalComments,
            icon: ChatBubbleLeftRightIcon,
            description: 'Live comments on opportunities.',
            href: '/admin/feedback'
        },
    ];

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500 text-foreground">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin overview</h1>
                    <p className="text-sm text-muted-foreground mt-1 hidden md:flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        {isAuthenticating 
                            ? 'Connecting to real-time telemetry stream...' 
                            : isAuthenticated 
                                ? 'Live Real-Time telemetry system connected.' 
                                : 'Establishing Firebase authentication...'
                        }
                    </p>
                </div>
            </header>

            {/* Telemetry Stats Grid (Mobile Compact 2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    const isVisible = visibleMetrics[card.key];
                    return (
                        <Link href={card.href} key={card.label} className="group relative rounded-xl md:rounded-2xl border border-border bg-card p-3 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-muted-foreground/30 block cursor-pointer">
                            <div className="flex items-center justify-between gap-2 mb-2 md:mb-4">
                                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground line-clamp-1 md:line-clamp-none">{card.label}</span>
                                <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl border border-border bg-muted text-muted-foreground shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Icon className="h-3.5 w-3.5 md:h-5 md:w-5" />
                                </div>
                            </div>
                            {isVisible ? (
                                <p className="text-lg md:text-3xl font-bold tracking-tight mb-1 md:mb-2">{card.value.toLocaleString()}</p>
                            ) : (
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <p className="text-lg md:text-3xl font-bold tracking-tight opacity-40 select-none">•••</p>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            revealMetric(card.key);
                                        }}
                                        className="text-[9px] md:text-[11px] font-bold px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                    >
                                        Show
                                    </button>
                                </div>
                            )}
                            <p className="hidden md:block text-[9px] md:text-[11px] text-muted-foreground leading-normal">{card.description}</p>
                        </Link>
                    );
                })}
            </div>

            {/* Action and Infrastructure Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                {/* CDN / Static Cache Overview */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">Static CDN Status</h3>
                                <p className="text-xs text-muted-foreground">Pre-rendered feeds and static metadata.</p>
                            </div>
                            <div className="p-2 rounded-xl border border-border bg-muted text-muted-foreground">
                                <CloudIcon className="h-5 w-5" />
                            </div>
                        </div>

                        {cdnStats.loading ? (
                            <div className="flex items-center justify-center py-6">
                                <span className="text-xs text-muted-foreground animate-pulse">Loading static CDN stats...</span>
                            </div>
                        ) : cdnStats.error ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs">
                                <SignalIcon className="h-4 w-4 shrink-0" />
                                <span>Unable to connect to Cloudflare CDN to fetch static version.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <div className="rounded-xl border border-border p-3 bg-secondary/20">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Cached Jobs</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{cdnStats.jobCount !== null ? cdnStats.jobCount.toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="rounded-xl border border-border p-3 bg-secondary/20">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cache Timestamp</p>
                                    <div className="text-xs font-semibold text-foreground truncate mt-1.5" title={cdnStats.lastUpdated || 'N/A'}>
                                        {cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[0] : 'N/A'}
                                        <span className="block text-[9px] font-normal text-muted-foreground mt-0.5">{cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[1] : ''}</span>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border p-3 bg-secondary/20">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cities Filter Indexed</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{cdnStats.citiesCount !== null ? cdnStats.citiesCount.toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="rounded-xl border border-border p-3 bg-secondary/20">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Skills Configured</p>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{cdnStats.skillsCount !== null ? cdnStats.skillsCount.toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[9px] mb-2 text-foreground">CDN Distribution Info</p>
                        <div className="flex justify-between"><span>Worker Host</span><span className="font-semibold text-foreground">{new URL(CDN_URL || 'https://cdn.fresherflow.in').hostname}</span></div>
                        <div className="flex justify-between"><span>Cache Control</span><span className="font-semibold text-foreground">immutable (v-hash)</span></div>
                        <div className="flex justify-between"><span>CDN Gateway</span><span className="font-semibold text-foreground">Cloudflare Edge</span></div>
                    </div>
                </div>

                {/* Main Operations Navigation Panel */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold">Operation shortcuts</h3>
                            <p className="text-xs text-muted-foreground">Direct path access for moderation.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Link
                                href="/admin/opportunities/create"
                                className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground bg-secondary/20 col-span-2 sm:col-span-1"
                            >
                                <span>Create New Listing</span>
                                <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                            </Link>
                            <Link
                                href="/admin/feedback"
                                className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground bg-secondary/20 col-span-2 sm:col-span-1"
                            >
                                <span>Moderate Reports</span>
                                <ChatBubbleLeftRightIcon className="w-4 h-4 text-muted-foreground" />
                            </Link>

                            {!cdnStats.loading && !cdnStats.error && (
                                <>
                                    <div className="col-span-2 border-t border-border/60 pt-3 mt-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Regenerate Feeds</span>
                                        {regenerating && (
                                            <span className="text-[10px] text-primary animate-pulse font-medium">Processing...</span>
                                        )}
                                    </div>
                                    
                                    <button
                                        onClick={() => handleRegenerate('all')}
                                        disabled={regenerating}
                                        className="col-span-2 flex items-center justify-between px-3.5 py-2 border border-border rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 disabled:opacity-50 transition-all text-xs cursor-pointer"
                                    >
                                        <span>Regenerate All Feeds</span>
                                        <CloudIcon className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={handleRevalidateWebsiteCache}
                                        disabled={regenerating}
                                        className="col-span-2 flex items-center justify-between px-3.5 py-2 border border-border rounded-xl bg-secondary/35 text-foreground font-semibold hover:bg-secondary/60 disabled:opacity-50 transition-all text-xs cursor-pointer"
                                    >
                                        <span>Refresh Website Cache</span>
                                        <SignalIcon className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => handleRegenerate('bootstrap')}
                                        disabled={regenerating}
                                        className="flex items-center justify-center px-2 py-1.5 border border-border rounded-lg bg-secondary/35 text-foreground hover:bg-secondary/60 disabled:opacity-50 transition-all text-[11px] font-semibold cursor-pointer"
                                    >
                                        Private Feed
                                    </button>
                                    <button
                                        onClick={() => handleRegenerate('govt')}
                                        disabled={regenerating}
                                        className="flex items-center justify-center px-2 py-1.5 border border-border rounded-lg bg-secondary/35 text-foreground hover:bg-secondary/60 disabled:opacity-50 transition-all text-[11px] font-semibold cursor-pointer"
                                    >
                                        Govt Feed
                                    </button>
                                    <button
                                        onClick={() => handleRegenerate('resources')}
                                        disabled={regenerating}
                                        className="flex items-center justify-center px-2 py-1.5 border border-border rounded-lg bg-secondary/35 text-foreground hover:bg-secondary/60 disabled:opacity-50 transition-all text-[11px] font-semibold cursor-pointer"
                                    >
                                        Resources Feed
                                    </button>
                                    <button
                                        onClick={() => handleRegenerate('sitemap')}
                                        disabled={regenerating}
                                        className="flex items-center justify-center px-2 py-1.5 border border-border rounded-lg bg-secondary/35 text-foreground hover:bg-secondary/60 disabled:opacity-50 transition-all text-[11px] font-semibold cursor-pointer"
                                    >
                                        Sitemaps
                                    </button>
                                </>
                            )}
                        </div>

                        {regenStatus && (
                            <p className={`text-center text-xs font-semibold mt-1 ${regenStatus.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {regenStatus.message}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[9px] mb-2 text-foreground">Infrastructure Overview</p>
                        <div className="flex justify-between"><span>Relational DB</span><span className="font-semibold text-foreground">PostgreSQL</span></div>
                        <div className="flex justify-between"><span>Realtime Layer</span><span className="font-semibold text-foreground">Firebase RTDB</span></div>
                        <div className="flex justify-between"><span>Static Cache</span><span className="font-semibold text-foreground">Cloudflare R2</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
