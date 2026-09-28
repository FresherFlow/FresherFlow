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
import { ref, onValue, get, query, limitToLast } from 'firebase/database';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { adminApi } from '@/lib/api/admin';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import { Button } from '@/ui/Button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ui/Card';
import { getErrorMessage } from '@/lib/utils/error';


interface DashboardState {
    totalUsers: number;
    totalViews: number;
    totalApplies: number;
    totalComments: number;
}

// Bounded RTDB windows (admin download-burn fix). No behavior change except the
// data window: previously three whole-tree onValue listeners re-downloaded
// /stats/global + /stats + /comments on every write underneath them.
// - OVERVIEW_STATS_CHILD_LIMIT = 200 most-recent /stats children (one-shot;
//   key-ordered limitToLast bounds per-opportunity stat nodes; no orderByChild
//   index exists for aggregate ordering, so the totals below reflect the recent
//   window, not a lifetime-exact sum once the tree exceeds the window).
// - OVERVIEW_COMMENTS_JOB_LIMIT = 30 most-recent /comments job buckets (one-shot
//   count; /comments is keyed by jobId so the query bounds job buckets, and the
//   count reflects that recent window).
const OVERVIEW_STATS_CHILD_LIMIT = 200;
const OVERVIEW_COMMENTS_JOB_LIMIT = 30;

export function OverviewTab() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isAuthenticated, isAuthenticating } = useFirebaseAdmin();
    const [dashboard, setDashboard] = useState<DashboardState>({
        totalUsers: 0,
        totalViews: 0,
        totalApplies: 0,
        totalComments: 0,
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
            console.error(`[Regenerate Feeds Error] ${getErrorMessage(err)}`);
            setRegenStatus({ type: 'error', message: getErrorMessage(err, 'An unexpected error occurred') });
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
            console.error(`[Website Cache Revalidate Error] ${getErrorMessage(err)}`);
            setRegenStatus({ type: 'error', message: getErrorMessage(err, 'An unexpected error occurred') });
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

    // ─── Bounded Firebase reads (whole-tree onValue replaced) ─────────────────────
    // Listens now: exactly ONE live listener (/stats/global scalar below). The
    // /stats aggregates and /comments count are one-shot get() reads: they change
    // on batch writes/regen and user activity, and a point-in-time value on mount
    // is sufficient for an overview — keeping onValue on them would re-download
    // whole subtrees on every write.
    // 1. KEPT live listener (the only one in this file): /stats/global scalar leaf.
    // Justification: this single small node drives the "Live telemetry" badge and
    // the user count; subscribing to one scalar costs one tiny payload per fire
    // instead of whole subtrees, so realtime here is cheap and intentional.
    useEffect(() => {
        if (!isAuthenticated) return;

        const globalStatsRef = ref(database, '/stats/global');
        const unsubscribeUsers = onValue(globalStatsRef, (snapshot) => {
            const data = snapshot.val();
            const count = data?.downloads || 0;
            setDashboard((prev) => ({ ...prev, totalUsers: count }));
        }, (err) => {
            console.error(`[Firebase Global Stats Fetch Fail] ${getErrorMessage(err)}`);
        });

        return () => unsubscribeUsers();
    }, [isAuthenticated]);

    // 2. One-shot bounded read of opportunity view & apply stats (no listener).
    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;
        const statsBounded = query(ref(database, '/stats'), limitToLast(OVERVIEW_STATS_CHILD_LIMIT));
        void get(statsBounded).then((snapshot) => {
            if (cancelled) return;
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
        }).catch((err) => {
            if (cancelled) return;
            console.error(`[Firebase Stats Fetch Fail] ${getErrorMessage(err)}`);
        });

        return () => { cancelled = true; };
    }, [isAuthenticated]);

    // 3. One-shot bounded read of total comments count (no listener).
    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;
        const commentsBounded = query(ref(database, '/comments'), limitToLast(OVERVIEW_COMMENTS_JOB_LIMIT));
        void get(commentsBounded).then((snapshot) => {
            if (cancelled) return;
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
        }).catch((err) => {
            if (cancelled) return;
            console.error(`[Firebase Comments Fetch Fail] ${getErrorMessage(err)}`);
        });

        return () => { cancelled = true; };
    }, [isAuthenticated]);

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
        <div className="space-y-6 text-foreground w-full font-sans antialiased relative z-0">
            {/* Header. The `h1` that used to sit in the mobile row is gone: it
                was `md:hidden`, so it only ever rendered on a phone — where
                `MobileTopNav` already prints the route name ("Admin Overview")
                and `/admin/dashboard` printed its own heading above it. Three
                titles stacked on one phone screen. `TopHeaderBar` takes over at
                `lg+`. The telemetry pill is all this row holds now. */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 md:border-none md:pb-0">
                <div className="flex items-center md:hidden">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        Live telemetry connected
                    </span>
                </div>
                
                {/* In-flow desktop bar (same pill + buttons, same order). */}
                <div className="hidden md:flex items-center gap-2 ml-auto shrink-0 animate-in fade-in zoom-in duration-300">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-full bg-success/10 border border-success/20 mr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        Live telemetry
                    </span>
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/opportunities/create" className="flex items-center gap-1.5">
                            <BriefcaseIcon className="w-4 h-4" />
                            <span>Create Listing</span>
                        </Link>
                    </Button>
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/feedback" className="flex items-center gap-1.5">
                            Moderate Reports
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/opportunities/create" className="flex items-center gap-1.5">
                            <BriefcaseIcon className="w-4 h-4" />
                            <span>Create Listing</span>
                        </Link>
                    </Button>
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/feedback" className="flex items-center gap-1.5">
                            Moderate Reports
                        </Link>
                    </Button>
                </div>
            </header>


            {/*
             * Telemetry stats — the shadcn-admin dashboard's four-card grid
             * (`features/dashboard/index.tsx`): `grid gap-4 sm:grid-cols-2
             * lg:grid-cols-4`, each card a CardHeader row of
             * `text-sm font-medium` title + `h-4 w-4 text-muted-foreground`
             * icon, and a CardContent of `text-2xl font-bold` value over a
             * `text-xs text-muted-foreground` caption. Cards link to their
             * workspace, which the reference's static cards do not.
             *
             * The reference's single column below `sm` is what made these boxes
             * one-per-row on a phone, so the base column count is 2 (a 2x2
             * block) and the gap opens up at `sm`; `lg:grid-cols-4` is the
             * reference's own step up. The value drops to `text-xl` below `sm`
             * so a 7-digit counter still fits a ~45%-wide card, and `break-words`
             * keeps a long one inside its card instead of over the neighbour.
             */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.label}
                            href={card.href}
                            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <Card className="h-full transition-colors hover:border-border">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="break-words text-xl font-bold sm:text-2xl">
                                        {card.value.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.description}</p>
                                </CardContent>
                            </Card>
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
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Cached Jobs</p>
                                <p className="text-xl font-bold tracking-tight font-mono">
                                    {cdnStats.loading ? <span className="animate-pulse">---</span> : cdnStats.error ? 'Error' : cdnStats.jobCount !== null ? cdnStats.jobCount.toLocaleString() : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30">
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Timestamp</p>
                                <div className="text-xs font-semibold truncate mt-1" title={cdnStats.lastUpdated || 'N/A'}>
                                    {cdnStats.loading ? <span className="animate-pulse">---</span> : cdnStats.error ? 'Error' : cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[0] : 'N/A'}
                                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                                        {cdnStats.loading ? '' : cdnStats.error ? '' : cdnStats.lastUpdated ? cdnStats.lastUpdated.split(',')[1] : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-xs text-muted-foreground space-y-2 font-mono">
                        <div className="flex justify-between items-center"><span className="opacity-70">Worker Host</span><span>{new URL(CDN_URL).hostname}</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">Cache Control</span><span>immutable</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">CDN Gateway</span><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>Cloudflare Edge</span></div>
                    </div>
                </div>

                {/* Main Operations Navigation Panel */}
                <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 hover:border-border/80 transition-all duration-300 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <SignalIcon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold tracking-tight">Cache & Revalidation</h3>
                        </div>
                        
                        {/* `grid-cols-1` below `sm`: each of these buttons carries a
                            title, a subtitle and an icon, and the `Button` primitive
                            is `whitespace-nowrap`. At `grid-cols-2` a ~300px phone
                            gave each button ~135px, so the nowrap subtitle overflowed
                            its box and painted over the neighbouring button. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="admin"
                                size="sm"
                                onClick={() => handleRegenerate('all')}
                                disabled={regenerating}
                                className="w-full"
                            >
                                <span className="flex w-full items-center justify-between gap-1.5 text-left">
                                <div className="flex flex-col items-start text-left">
                                    <span>Regenerate All Feeds</span>
                                    <span className="text-xs font-normal opacity-80 mt-0.5">Rebuild static API for mobile</span>
                                </div>
                                <span className="shrink-0">{regenerating ? <span className="animate-spin"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span> : <CloudIcon className="w-4 h-4" />}</span>
                                </span>
                            </Button>

                            <Button
                                variant="admin"
                                size="sm"
                                onClick={handleRevalidateWebsiteCache}
                                disabled={regenerating}
                                className="w-full"
                            >
                                <span className="flex w-full items-center justify-between gap-1.5 text-left">
                                <div className="flex flex-col items-start text-left">
                                    <span>Refresh Cache</span>
                                    <span className="text-xs font-normal opacity-80 mt-0.5">Clear Next.js server cache</span>
                                </div>
                                <SignalIcon className="w-4 h-4 shrink-0" />
                                </span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                                <Button
                                    variant="admin"
                                    size="sm"
                                    onClick={() => handleRegenerate('bootstrap')}
                                    disabled={regenerating}
                                >
                                    <span>Private Feed</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    onClick={() => handleRegenerate('govt')}
                                    disabled={regenerating}
                                >
                                    <span>Govt Feed</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    onClick={() => handleRegenerate('resources')}
                                    disabled={regenerating}
                                >
                                    <span>Resources</span>
                                </Button>
                                <Button
                                    variant="admin"
                                    size="sm"
                                    onClick={() => handleRegenerate('sitemap')}
                                    disabled={regenerating}
                                >
                                    <span>Sitemaps</span>
                                </Button>
                            </div>

                        {regenStatus && (
                            <p className={`text-xs p-2 rounded border font-mono ${regenStatus.type === 'success' ? 'text-success bg-success/10 border-success/20' : 'text-destructive bg-destructive/10 border-destructive/20'}`}>
                                {regenStatus.message}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-xs text-muted-foreground space-y-2 font-mono">
                        <div className="flex justify-between items-center"><span className="opacity-70">Relational DB</span><span>PostgreSQL</span></div>
                        <div className="flex justify-between items-center"><span className="opacity-70">Realtime Layer</span><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>Firebase</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
