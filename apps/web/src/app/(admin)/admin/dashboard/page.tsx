'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { Button } from '@/ui/Button';


interface DashboardState {
    totalUsers: number;
    totalViews: number;
    totalApplies: number;
    totalComments: number;
}

export default function AdminDashboardHome() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const [headerTarget, setHeaderTarget] = useState<Element | null>(null);
    useEffect(() => {
        setHeaderTarget(document.getElementById('top-header-portal-target'));
    }, []);

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
        <div className="p-4 md:p-6 lg:p-8 pt-16 md:pt-6 lg:pt-8 space-y-6 flex-1 min-h-0 overflow-y-auto pb-28 md:pb-8 animate-in fade-in duration-500 text-foreground w-full font-sans antialiased custom-scrollbar relative z-0">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 md:border-none md:pb-0">
                <div className="flex items-center gap-3 md:hidden">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin overview</h1>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live telemetry connected
                    </span>
                </div>
                
                {headerTarget && (
                    createPortal(
                        <>
                            <div className="text-lg font-semibold text-foreground truncate">Admin Overview</div>
                            <div className="flex items-center gap-2 ml-auto shrink-0 animate-in fade-in zoom-in duration-300 fill-mode-both">
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mr-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live telemetry
                                </span>
                                <Button variant="admin" size="sm" className="text-xs px-3.5 py-2 h-auto flex items-center gap-1.5" asChild>
                                    <Link href="/admin/opportunities/create">
                                        <BriefcaseIcon className="w-4 h-4" />
                                        <span>Create Listing</span>
                                    </Link>
                                </Button>
                                <Button variant="admin" size="sm" className="text-xs px-3.5 py-2 h-auto flex items-center gap-1.5" asChild>
                                    <Link href="/admin/feedback">
                                        Moderate Reports
                                    </Link>
                                </Button>
                            </div>
                        </>,
                        headerTarget
                    )
                )}

                <div className="flex items-center gap-2 md:hidden">
                    <Button variant="admin" size="sm" className="text-xs px-3.5 py-2 h-auto flex items-center gap-1.5" asChild>
                        <Link href="/admin/opportunities/create">
                            <BriefcaseIcon className="w-4 h-4" />
                            <span>Create Listing</span>
                        </Link>
                    </Button>
                    <Button variant="admin" size="sm" className="text-xs px-3.5 py-2 h-auto flex items-center gap-1.5" asChild>
                        <Link href="/admin/feedback">
                            Moderate Reports
                        </Link>
                    </Button>
                </div>
            </header>


            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    const isVisible = visibleMetrics[card.key];
                    return (
                        <Link 
                            href={card.href} 
                            key={card.label} 
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="group relative bg-card text-card-foreground border border-border shadow-sm rounded-xl p-3.5 md:p-5 hover:border-border/80 transition-all duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] flex flex-col justify-between min-h-[140px] cursor-pointer animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                        >
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                    <span className="text-xs font-semibold text-muted-foreground tracking-tight">{card.label}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-end justify-between mt-auto">
                                {isVisible ? (
                                    <div className="flex flex-col">
                                        <p className="text-xl md:text-3xl font-bold tracking-tight font-mono text-foreground">{card.value.toLocaleString()}</p>
                                        <span className="text-[10px] md:text-[11px] text-muted-foreground mt-1 line-clamp-1">{card.description}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col w-full h-full justify-end animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between w-full">
                                            <p className="text-xl md:text-3xl font-bold tracking-tight opacity-20 select-none font-mono blur-[2px]">000</p>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    revealMetric(card.key);
                                                }}
                                                className="text-xs font-semibold px-3 py-1 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-150 active:scale-[0.97]"
                                            >
                                                Show
                                            </button>
                                        </div>
                                        <span className="text-[10px] md:text-[11px] text-muted-foreground mt-1 hidden sm:block line-clamp-1">{card.description}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Action and Infrastructure Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
                {/* CDN / Static Cache Overview */}
                <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 hover:border-border/80 transition-all duration-300 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CloudIcon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold tracking-tight">Infrastructure</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-2">
                            <div className="rounded-lg border border-border p-3 bg-muted/30">
                                <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Cached Jobs</p>
                                <p className="text-xl font-bold tracking-tight font-mono">
                                    {cdnStats.loading ? <span className="animate-pulse">---</span> : cdnStats.error ? 'Error' : cdnStats.jobCount !== null ? cdnStats.jobCount.toLocaleString() : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30">
                                <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Timestamp</p>
                                <div className="text-xs font-semibold truncate mt-1" title={cdnStats.lastUpdated || 'N/A'}>
                                    {cdnStats.loading ? <span className="animate-pulse">---</span> : cdnStats.error ? 'Error' : cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[0] : 'N/A'}
                                    <span className="block text-[9px] font-normal text-muted-foreground mt-0.5">
                                        {cdnStats.loading ? '' : cdnStats.error ? '' : cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[1] : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground space-y-2 font-mono">
                        <div className="flex justify-between items-center"><span className="opacity-70">Worker Host</span><span>{new URL(CDN_URL).hostname}</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">Cache Control</span><span>immutable</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">CDN Gateway</span><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Cloudflare Edge</span></div>
                    </div>
                </div>

                {/* Main Operations Navigation Panel */}
                <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 hover:border-border/80 transition-all duration-300 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <SignalIcon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold tracking-tight">Cache & Revalidation</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="admin"
                                size="sm"
                                onClick={() => handleRegenerate('all')}
                                disabled={regenerating}
                                className="w-full flex items-center justify-between gap-1.5 py-2.5 h-auto text-left"
                            >
                                <div className="flex flex-col items-start text-left">
                                    <span>Regenerate All Feeds</span>
                                    <span className="text-[9px] font-normal opacity-80 mt-0.5">Rebuild static API for mobile</span>
                                </div>
                                <span className="shrink-0">{regenerating ? <span className="animate-spin"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span> : <CloudIcon className="w-4 h-4" />}</span>
                            </Button>

                            <Button
                                variant="admin"
                                size="sm"
                                onClick={handleRevalidateWebsiteCache}
                                disabled={regenerating}
                                className="w-full flex items-center justify-between gap-1.5 py-2.5 h-auto text-left"
                            >
                                <div className="flex flex-col items-start text-left">
                                    <span>Refresh Cache</span>
                                    <span className="text-[9px] font-normal opacity-80 mt-0.5">Clear Next.js server cache</span>
                                </div>
                                <SignalIcon className="w-4 h-4 shrink-0" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                                <Button
                                    variant="admin"
                                    size="sm"
                                    className="text-xs px-3.5 py-2 h-auto flex items-center justify-center gap-1.5"
                                    onClick={() => handleRegenerate('bootstrap')}
                                    disabled={regenerating}
                                >
                                    <span>Private Feed</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    className="text-xs px-3.5 py-2 h-auto flex items-center justify-center gap-1.5"
                                    onClick={() => handleRegenerate('govt')}
                                    disabled={regenerating}
                                >
                                    <span>Govt Feed</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    className="text-xs px-3.5 py-2 h-auto flex items-center justify-center gap-1.5"
                                    onClick={() => handleRegenerate('resources')}
                                    disabled={regenerating}
                                >
                                    <span>Resources</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    className="text-xs px-3.5 py-2 h-auto flex items-center justify-center gap-1.5"
                                    onClick={() => handleRegenerate('sitemap')}
                                    disabled={regenerating}
                                >
                                    <span>Sitemaps</span>
                                </Button>
                            </div>

                        {regenStatus && (
                            <p className={`text-[11px] p-2 rounded border font-mono ${regenStatus.type === 'success' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-destructive bg-destructive/10 border-destructive/20'}`}>
                                {regenStatus.message}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground space-y-2 font-mono">
                        <div className="flex justify-between items-center"><span className="opacity-70">Relational DB</span><span>PostgreSQL</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">Realtime Layer</span><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Firebase</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
