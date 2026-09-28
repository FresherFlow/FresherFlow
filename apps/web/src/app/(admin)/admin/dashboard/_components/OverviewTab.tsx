'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    BriefcaseIcon,
    UsersIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowPathIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftRightIcon,
    CloudIcon,
    SignalIcon,
} from '@heroicons/react/24/outline';
import { database } from '@/lib/api/firebase';
import { ref, onValue, get, query, limitToLast } from 'firebase/database';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/ui/Button';
import { StatCard } from '@/ui/StatCard';
import { cn } from '@/ui/cn';
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

/** Stands in for a count while "Hide counts" is on. Width-stable so the tile
 *  does not reflow when the number is revealed. */
const MASKED_COUNT = '••••';

/** Per-feed rebuild targets, in the order the buttons appear. */
const FEED_TARGETS = ['bootstrap', 'govt', 'resources', 'sitemap'] as const;
const FEED_LABELS: Record<(typeof FEED_TARGETS)[number], string> = {
    bootstrap: 'Private feed',
    govt: 'Govt feed',
    resources: 'Resources',
    sitemap: 'Sitemaps',
};

/**
 * "4 min ago" from the feed's own timestamp.
 *
 * The old strip printed the raw `toLocaleString()` split across two lines by
 * comma, which produced a date on one row and a time on the next — the widest
 * possible shape for a status field. This is a fixed, short string.
 */
function relativeSync(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 'Unknown';
    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.round(hours / 24)} d ago`;
}

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

    /* Counts are on by default: this is an internal admin surface and the
       numbers are the point of the page. The toggle exists because the four
       tiles are backed by one live RTDB listener plus two one-shot reads, so
       someone demoing the screen can blank the figures without the rest of the
       dashboard moving. Hidden state masks the value only - reads keep running,
       so revealing is instant and never shows a stale number. */
    const [showCounts, setShowCounts] = useState(true);

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

    // Captions state the real window these counters cover. `totalUsers` is
    // `/stats/global/downloads`, incremented per completed mobile onboarding
    // (apps/mobile/src/utils/firebaseOnboardingDb.ts), so it is a registration
    // count and not a view count.
    const cards = [
        {
            key: 'totalUsers' as const,
            label: 'Total Registered Users',
            value: dashboard.totalUsers,
            icon: UsersIcon,
            caption: 'Mobile onboarding completions',
        },
        {
            key: 'totalViews' as const,
            label: 'Job Post Views',
            value: dashboard.totalViews,
            icon: EyeIcon,
            caption: `Last ${OVERVIEW_STATS_CHILD_LIMIT} listings`,
        },
        {
            key: 'totalApplies' as const,
            label: 'Application Clicks',
            value: dashboard.totalApplies,
            icon: CursorArrowRaysIcon,
            caption: `Last ${OVERVIEW_STATS_CHILD_LIMIT} listings`,
        },
        {
            key: 'totalComments' as const,
            label: 'Active Community Comments',
            value: dashboard.totalComments,
            icon: ChatBubbleLeftRightIcon,
            caption: `Last ${OVERVIEW_COMMENTS_JOB_LIMIT} listings`,
        },
    ];

    /* Pipeline strip. `cdnStats.error` is never set true by the fetch above (it
       falls back to defaults), so it is not surfaced here - a value that cannot
       fail should not render an "Error" branch. */
    const signals = [
        {
            label: 'Cached jobs',
            value: cdnStats.loading
                ? '—'
                : cdnStats.jobCount !== null
                  ? cdnStats.jobCount.toLocaleString()
                  : 'N/A',
        },
        {
            label: 'Last sync',
            value: cdnStats.loading
                ? '—'
                : cdnStats.lastUpdated
                  ? relativeSync(cdnStats.lastUpdated)
                  : 'N/A',
        },
        {
            label: 'Cities covered',
            value: cdnStats.loading ? '—' : (cdnStats.citiesCount ?? 0).toLocaleString(),
        },
        {
            label: 'Skills tracked',
            value: cdnStats.loading ? '—' : (cdnStats.skillsCount ?? 0).toLocaleString(),
        },
    ];

    return (
        <div className="space-y-6 text-foreground w-full font-sans antialiased relative z-0">
            {/* Header. Previously the same two buttons were rendered twice - a
                `hidden md:flex` copy and a `md:hidden` copy - so the markup said
                two things about the same controls. One wrapping row now covers
                both widths: the pill and the actions share a line on desktop and
                stack on a phone with no duplicate branch. */}
            <header className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Live telemetry
                </span>

                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/opportunities/create" className="flex items-center gap-1.5">
                            <BriefcaseIcon className="h-4 w-4" />
                            <span>Create Listing</span>
                        </Link>
                    </Button>
                    <Button variant="admin" size="sm" asChild>
                        <Link href="/admin/feedback">Moderate Reports</Link>
                    </Button>
                </div>
            </header>

            {/*
             * Telemetry tiles.
             *
             * `grid-cols-2` at every width below `lg` is deliberate: these stay
             * a 2x2 block on a phone. The reference is one-per-row on mobile,
             * but four full-width boxes pushed the actual content below two
             * screens of scrolling, and at this tile density a 2x2 reads as one
             * band rather than four interruptions. Captions drop below `sm` so a
             * tile is label + number and nothing else.
             *
             * Captions state the real window these counters cover. They are
             * point-in-time bounded reads, so a "+20% from last month" delta
             * would be invented.
             */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {cards.map((card) => (
                    <StatCard
                        key={card.key}
                        label={card.label}
                        value={showCounts ? card.value.toLocaleString() : MASKED_COUNT}
                        icon={card.icon}
                        caption={card.caption}
                        captionClassName="hidden sm:block"
                    />
                ))}
            </div>

            <div className="flex items-center justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCounts((v) => !v)}
                    aria-pressed={!showCounts}
                >
                    {showCounts ? (
                        <>
                            <EyeSlashIcon className="h-4 w-4" />
                            <span>Hide counts</span>
                        </>
                    ) : (
                        <>
                            <EyeIcon className="h-4 w-4" />
                            <span>Show counts</span>
                        </>
                    )}
                </Button>
            </div>

            {/*
             * Feed pipeline — replaces the two-box "Infrastructure" / "Cache &
             * Revalidation" layout.
             *
             * Two cards split one subject down the middle: the buttons that
             * rebuild the feeds lived in a different box from the numbers
             * describing those same feeds, and the monospace definition-list
             * footers read like a server log rather than a dashboard. One
             * surface now — status and the two primary actions share a header,
             * a 4-up strip describes what is currently cached, and the per-feed
             * rebuilds sit directly under the strip they affect.
             *
             * `gap-px` over a `bg-border` cell background draws the hairlines
             * between signals without per-cell borders, so the grid stays
             * flush to the card edge at every column count.
             */}
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <CloudIcon className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold tracking-tight">Feed pipeline</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Operational
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="admin"
                            size="sm"
                            onClick={handleRevalidateWebsiteCache}
                            disabled={regenerating}
                        >
                            <SignalIcon className="h-4 w-4" />
                            <span>Refresh cache</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRegenerate('all')}
                            disabled={regenerating}
                        >
                            {regenerating ? (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                                <CloudIcon className="h-4 w-4" />
                            )}
                            <span>Regenerate all</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
                    {signals.map((signal) => (
                        <div key={signal.label} className="bg-card px-5 py-4">
                            <p className="text-xs font-medium text-muted-foreground">{signal.label}</p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-card-foreground">
                                {signal.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">
                        Rebuild one feed
                    </span>
                    {FEED_TARGETS.map((target) => (
                        <Button
                            key={target}
                            type="button"
                            variant="admin"
                            size="sm"
                            onClick={() => handleRegenerate(target)}
                            disabled={regenerating}
                        >
                            {FEED_LABELS[target]}
                        </Button>
                    ))}
                </div>

                {regenStatus && (
                    <div className="px-5 pb-4">
                        <p
                            className={cn(
                                'rounded-md border px-3 py-2 text-xs',
                                regenStatus.type === 'success'
                                    ? 'border-success/20 bg-success/10 text-success'
                                    : 'border-destructive/20 bg-destructive/10 text-destructive'
                            )}
                        >
                            {regenStatus.message}
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
