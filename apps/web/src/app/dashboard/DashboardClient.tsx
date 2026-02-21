'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { opportunitiesApi, dashboardApi, savedApi } from '@/lib/api/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import JobCard from '@/features/jobs/components/JobCard';
import { Button } from '@/components/ui/Button';
import { formatSyncTime, getFeedLastSyncAt } from '@/lib/offline/syncStatus';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import { calculateOpportunityMatch } from '@/lib/matchScore';
import { OpportunityEventType } from '@fresherflow/types';
import { OfflineError } from '@/lib/api/client';

// ── Dashboard feed cache ─────────────────────────────────────────────────────
const DASH_CACHE_KEY = 'ff_dashboard_cache_v1';

function readDashCache(): Opportunity[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(DASH_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { opportunities: Opportunity[] };
        return Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
    } catch { return []; }
}

function writeDashCache(opportunities: Opportunity[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ opportunities, savedAt: Date.now() }));
    } catch { /* ignore quota */ }
}
// ─────────────────────────────────────────────────────────────────────────────

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;
const MOBILE_DASHBOARD_LIMIT = 8;
const DESKTOP_DASHBOARD_LIMIT = 24;

type TabKey = 'featured' | 'latest' | 'expiring' | 'all' | 'applied' | 'archived';

type DriveMilestone = {
    opportunityId: string;
    eventId: string;
    eventType: OpportunityEventType;
    eventDate: string | Date;
    eventTitle: string;
    opportunity: Opportunity;
};

type HighlightsData = {
    urgent: { walkins: Opportunity[]; others: Opportunity[] };
    newlyAdded: Opportunity[];
    newSinceLastVisit?: Opportunity[];
    newSinceLastVisitCount?: number;
    driveMilestones?: DriveMilestone[];
};

export default function DashboardClient() {
    const { user, profile, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [recentOpps, setRecentOpps] = useState<Opportunity[]>(() => readDashCache());
    const [isLoadingOpps, setIsLoadingOpps] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        try { return !localStorage.getItem(DASH_CACHE_KEY); } catch { return true; }
    });
    const [highlights, setHighlights] = useState<HighlightsData | null>(null);
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [highlightsError, setHighlightsError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [feedLastSyncAt, setFeedLastSyncAt] = useState<number | null>(null);
    const [dashboardVisitCounter, setDashboardVisitCounter] = useState(0);
    const [activeTab, setActiveTab] = useState<TabKey>('featured');
    const [showBackToTop, setShowBackToTop] = useState(false);

    const loadRecentOpportunities = useCallback(async () => {
        setRecentError(null);
        try {
            const data = await opportunitiesApi.list({ sort: 'freshness_v2' }) as { opportunities: Opportunity[] };
            const sanitized = (data.opportunities || []).slice(0, 60).map((o: Opportunity) => ({
                ...o,
                locations: o.locations || [],
                requiredSkills: o.requiredSkills || []
            }));
            setRecentOpps(sanitized);
            writeDashCache(sanitized);
        } catch (err: unknown) {
            if (err instanceof OfflineError) return;
            setRecentError((err as Error)?.message || 'Unable to load recommended listings');
        } finally {
            setIsLoadingOpps(false);
            setFeedLastSyncAt(getFeedLastSyncAt());
        }
    }, []);

    const loadHighlights = useCallback(async () => {
        setHighlightsError(null);
        try {
            const data = await dashboardApi.getHighlights() as HighlightsData;
            setHighlights(data);
        } catch (err: unknown) {
            if (err instanceof OfflineError) return;
            setHighlightsError((err as Error)?.message || 'Unable to load highlights');
        } finally {
            setIsLoadingHighlights(false);
            setFeedLastSyncAt(getFeedLastSyncAt());
        }
    }, []);

    // On auth ready: load feed first, then stagger highlights
    useEffect(() => {
        if (!authLoading && user && profile?.completionPercentage === 100 && !hasLoaded) {
            setHasLoaded(true);
            loadRecentOpportunities().then(() => {
                // Stagger highlights load AFTER feed — reduces blocking JS on mount
                loadHighlights();
            });
        }
    }, [authLoading, user, profile, hasLoaded, loadRecentOpportunities, loadHighlights]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsOnline(window.navigator.onLine);
        setFeedLastSyncAt(getFeedLastSyncAt());
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleScroll = () => setShowBackToTop(window.scrollY > 420);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !user) return;
        const lastSeenStorageKey = 'ff_dashboard_last_seen_at';
        const visitStorageKey = 'ff_dashboard_visit_counter';
        window.localStorage.setItem(lastSeenStorageKey, String(Date.now()));
        const previousVisits = Number(window.localStorage.getItem(visitStorageKey) || '0');
        const nextVisits = Number.isFinite(previousVisits) ? previousVisits + 1 : 1;
        window.localStorage.setItem(visitStorageKey, String(nextVisits));
        setDashboardVisitCounter(nextVisits);
    }, [user]);

    const toggleSave = async (opportunityId: string) => {
        try {
            const result = await savedApi.toggle(opportunityId) as { saved: boolean };
            setRecentOpps(prev => prev.map(opp =>
                opp.id === opportunityId ? { ...opp, isSaved: result.saved } : opp
            ));
            setHighlights(prev => {
                if (!prev) return null;
                const updateList = (list: Opportunity[]) => list.map(o => o.id === opportunityId ? { ...o, isSaved: result.saved } : o);
                return {
                    urgent: { walkins: updateList(prev.urgent.walkins), others: updateList(prev.urgent.others) },
                    newlyAdded: updateList(prev.newlyAdded),
                    newSinceLastVisit: updateList(prev.newSinceLastVisit || []),
                    newSinceLastVisitCount: prev.newSinceLastVisitCount || 0,
                    driveMilestones: prev.driveMilestones || []
                };
            });
        } catch {
            toast.error('Bookmark update failed');
        }
    };

    const retryAll = () => {
        setIsLoadingOpps(true);
        setIsLoadingHighlights(true);
        loadRecentOpportunities();
        loadHighlights();
    };

    const getDaysToExpiry = (expiresAt?: string | Date | null) => {
        if (!expiresAt) return null;
        const diffMs = new Date(expiresAt).getTime() - new Date().getTime();
        return Math.ceil(diffMs / HOURS_24_IN_MS);
    };

    // ── Tab Virtualization: compute ONLY the active tab's data ────────────────
    const { activeItems, closingSoon, totalActive, jobsCount, internshipsCount, walkinsCount } = useMemo(() => {
        const rotateByOffset = <T,>(items: T[], offset: number) => {
            if (items.length <= 1) return items;
            const norm = ((offset % items.length) + items.length) % items.length;
            return norm === 0 ? items : [...items.slice(norm), ...items.slice(0, norm)];
        };

        const active = recentOpps
            .filter(o => !o.expiresAt || new Date(o.expiresAt) > new Date())
            .map(opp => {
                const match = calculateOpportunityMatch(profile, opp);
                return { ...opp, matchScore: match.score, matchReason: match.reason };
            });

        const rotationOffset = Math.max(0, dashboardVisitCounter - 1) * 4;

        const latestSorted = [...active].sort(
            (a, b) => new Date(b.postedAt as string | Date).getTime() - new Date(a.postedAt as string | Date).getTime()
        );

        const bestMatch = rotateByOffset(
            [...active].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)),
            rotationOffset
        );

        const closing = active
            .filter(o => o.expiresAt)
            .sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime())
            .slice(0, 8);

        const newIn24h = latestSorted
            .filter(o => (Date.now() - new Date(o.postedAt as string | Date).getTime()) <= HOURS_24_IN_MS)
            .slice(0, 10);

        const archived = recentOpps.filter(o => o.status === 'ARCHIVED' || (!!o.expiresAt && new Date(o.expiresAt) <= new Date()));
        const applied = recentOpps.filter(o =>
            (o.actions || []).some(action =>
                ['APPLIED', 'PLANNED', 'INTERVIEWED', 'SELECTED', 'PLANNING', 'ATTENDED'].includes(action.actionType)
            )
        );

        const featured = [
            ...((highlights?.newSinceLastVisit || []).filter(c => !closing.some(s => s.id === c.id))),
            ...closing,
            ...newIn24h.filter(c => !closing.some(s => s.id === c.id)),
            ...bestMatch.filter(c => !closing.some(s => s.id === c.id) && !newIn24h.some(f => f.id === c.id)),
        ];

        // Only the active tab's items are sliced — no unused computation
        const limit = (items: Opportunity[], mobile: boolean) => items.slice(0, mobile ? MOBILE_DASHBOARD_LIMIT : DESKTOP_DASHBOARD_LIMIT);
        const tabMap: Record<TabKey, Opportunity[]> = {
            featured, latest: latestSorted, expiring: closing, all: bestMatch, applied, archived
        };
        const currentItems = tabMap[activeTab] || featured;

        return {
            activeItems: { mobile: limit(currentItems, true), desktop: limit(currentItems, false) },
            closingSoon: closing,
            totalActive: active.length || 1,
            jobsCount: active.filter(o => o.type === 'JOB').length,
            internshipsCount: active.filter(o => o.type === 'INTERNSHIP').length,
            walkinsCount: active.filter(o => o.type === 'WALKIN').length,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recentOpps, highlights, dashboardVisitCounter, profile?.id, activeTab]);

    const tabs: { key: TabKey; title: string }[] = [
        { key: 'featured', title: 'Featured' },
        { key: 'latest', title: 'Latest' },
        { key: 'expiring', title: 'Expiring Soon' },
        { key: 'all', title: 'All Jobs' },
        { key: 'applied', title: 'Applied' },
        { key: 'archived', title: 'Archived' },
    ];

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-8 pb-12 md:pb-20 px-3 md:px-6">
                    {/* Compact Header */}
                    <div className="flex flex-col gap-1.5 md:gap-3 border-b border-border/60 pb-2.5 md:pb-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                            <div className="space-y-1">
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                    Welcome back, {user?.fullName?.split(' ')[0] || 'candidate'}.
                                </h1>
                                <p className="text-[11px] md:text-xs text-muted-foreground">Move fast on verified listings.</p>
                            </div>
                            <div className="hidden md:flex flex-wrap gap-2">
                                <Button asChild className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">
                                    <Link href="/opportunities">
                                        <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                                        Open feed
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">
                                    <Link href="/profile">
                                        <UserIcon className="w-4 h-4 mr-2" />
                                        Update profile
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Highlights — renders after feed (staggered) */}
                    {!isLoadingHighlights && highlights && (
                        (() => {
                            const isNotExpired = (o: Opportunity) => !o.expiresAt || new Date(o.expiresAt) > new Date();
                            const activeWalkins = highlights.urgent.walkins.filter(isNotExpired);
                            const activeNew = highlights.newlyAdded.filter(isNotExpired);
                            if (activeWalkins.length === 0 && activeNew.length === 0) return null;
                            return (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary dark:text-amber-300">Fresh &amp; Urgent</h2>
                                        </div>
                                        <Link href="/opportunities" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                                            View feed
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {activeWalkins.map(opp => (
                                            <div
                                                key={`urgent-${opp.id}`}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 cursor-pointer hover:bg-amber-500/10 transition-all flex flex-col justify-between gap-2 group"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-900 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">Urgent Walk-in</span>
                                                        <div className="flex items-center gap-1 text-[9px] text-slate-700 dark:text-amber-300 font-bold tracking-tight">
                                                            <ClockIcon className="w-3 h-3" />
                                                            Closing Soon
                                                        </div>
                                                    </div>
                                                    <h3 className="font-bold text-sm tracking-tight line-clamp-1 group-hover:text-primary dark:group-hover:text-amber-300 transition-colors">{opp.title}</h3>
                                                    <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{opp.company} &bull; {opp.locations[0]}</p>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-amber-500/10 pt-2">
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 dark:text-amber-300/60">Verified Drive</span>
                                                    <ChevronRightIcon className="w-4 h-4 text-primary dark:text-amber-300 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                        {activeNew.slice(0, activeWalkins.length > 0 ? 2 : 3).map(opp => (
                                            <div
                                                key={`new-${opp.id}`}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-all flex flex-col justify-between gap-2 group"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">New Listing</span>
                                                        <span className="text-[10px] text-primary font-bold">Just Added</span>
                                                    </div>
                                                    <h3 className="font-bold text-sm tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</h3>
                                                    <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{opp.company} &bull; {opp.locations[0]}</p>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-primary/60">Active Hiring</span>
                                                    <ChevronRightIcon className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()
                    )}

                    {!isLoadingHighlights && highlights?.driveMilestones && highlights.driveMilestones.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Campus Drive Timeline</h2>
                                <Link href="/opportunities" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                                    Track all
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {highlights.driveMilestones.map((milestone) => (
                                    <button
                                        key={milestone.eventId}
                                        onClick={() => router.push(getOpportunityPathFromItem(milestone.opportunity))}
                                        className="text-left rounded-2xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
                                    >
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-primary">{milestone.eventType.replace('_', ' ')}</p>
                                        <h3 className="mt-1 text-sm font-semibold line-clamp-1">{milestone.opportunity.title}</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{milestone.opportunity.company}</p>
                                        <p className="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                            {new Date(milestone.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                        <p className="mt-2 text-[11px] text-foreground/80 line-clamp-1">{milestone.eventTitle}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Main Grid */}
                    <div className="space-y-6 md:space-y-8">
                        <div className="space-y-3 md:space-y-6">
                            {(recentError || highlightsError) && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="text-xs text-foreground">Data sync issues. Browse existing listings.</div>
                                    <Button variant="outline" onClick={retryAll} className="h-8 px-3 text-[10px] border-primary/30 text-primary">Retry</Button>
                                </div>
                            )}

                            {/* Tab Bar — shared for mobile/desktop, only styling differs */}
                            <div className="border-b border-border/60">
                                {/* Mobile tabs */}
                                <div className="md:hidden flex items-center gap-1 overflow-x-auto no-scrollbar">
                                    {tabs.map(s => (
                                        <button
                                            key={s.key}
                                            onClick={() => setActiveTab(s.key)}
                                            className={`relative whitespace-nowrap px-3 py-2 text-[12px] font-semibold transition-colors ${activeTab === s.key ? 'text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {s.title}
                                            {activeTab === s.key && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-7 rounded-full bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                                {/* Desktop tabs */}
                                <div className="hidden md:flex items-center gap-6">
                                    {tabs.map(s => (
                                        <button
                                            key={`dt-${s.key}`}
                                            onClick={() => setActiveTab(s.key)}
                                            className={`relative pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === s.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {s.title}
                                            {activeTab === s.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary animate-in fade-in zoom-in duration-300" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Feed — only active tab rendered */}
                            <div className="md:hidden min-h-[600px]">
                                {isLoadingOpps ? (
                                    <div className="space-y-4"><SkeletonJobCard /><SkeletonJobCard /></div>
                                ) : activeItems.mobile.length === 0 ? (
                                    <div className="p-10 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">No listings here yet.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeItems.mobile.map((opp: Opportunity, idx: number) => (
                                            <JobCard
                                                key={`mob-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={false}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                isAdmin={user?.role === 'ADMIN'}
                                                priority={idx < 2}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Desktop Feed — only active tab rendered */}
                            <div className="hidden md:block min-h-[600px]">
                                {isLoadingOpps ? (
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                                        {[1, 2, 3, 4].map(i => <SkeletonJobCard key={i} />)}
                                    </div>
                                ) : activeItems.desktop.length === 0 ? (
                                    <div className="p-12 text-center border border-dashed border-border rounded-xl">
                                        <p className="text-sm font-medium text-muted-foreground">No results found in this section.</p>
                                        <Button asChild variant="outline" className="mt-4 h-8 text-[10px] font-bold uppercase tracking-widest">
                                            <Link href="/opportunities">Browse all feed</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {activeItems.desktop.map((opp: Opportunity) => (
                                            <JobCard
                                                key={`desk-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={false}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <section className="space-y-4 min-h-[320px]">
                            <h2 className="text-sm font-bold uppercase tracking-wider">Intelligence</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-2">
                                    <h3 className="text-[10px] font-bold text-primary uppercase">Snapshot</h3>
                                    <p className="text-xs text-muted-foreground">Listings prioritized for your profile.</p>
                                </div>
                                <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-3">
                                    <h3 className="text-[10px] font-bold text-success uppercase">Deadline radar</h3>
                                    <div className="space-y-2">
                                        {closingSoon.slice(0, 3).map(opp => (
                                            <button key={`side-${opp.id}`} onClick={() => router.push(getOpportunityPathFromItem(opp))} className="w-full text-left p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                                                <p className="text-[11px] font-semibold truncate">{opp.title}</p>
                                                <p className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                    {getDaysToExpiry(opp.expiresAt)}d remaining
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase">Activity pulse</h3>
                                    {[
                                        { label: 'Jobs', count: jobsCount },
                                        { label: 'Internships', count: internshipsCount },
                                        { label: 'Walk-ins', count: walkinsCount },
                                    ].map(item => (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex justify-between text-[10px]">
                                                <span>{item.label}</span>
                                                <span>{item.count}</span>
                                            </div>
                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary/60" style={{ width: `${Math.min(100, (item.count / totalActive) * 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 flex items-center justify-center">
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 px-2 py-0.5 rounded-full border border-border/30">
                                    {isOnline ? 'Network Stable' : 'Offline Mode'} &bull; Last Sync {formatSyncTime(feedLastSyncAt)}
                                </span>
                            </div>
                        </section>
                    </div>
                </div>
                {showBackToTop && (
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-24 md:bottom-8 right-4 z-40 h-10 px-3 rounded-full border border-border bg-card/95 shadow-sm text-[10px] font-bold uppercase tracking-wider text-foreground hover:border-primary/40 hover:text-primary transition-all"
                        aria-label="Back to top"
                    >
                        Top
                    </button>
                )}
            </ProfileGate>
        </AuthGate>
    );
}
