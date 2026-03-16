'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { opportunitiesApi, dashboardApi, savedApi } from '@/lib/api/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
// removed unused sync status import
import { calculateOpportunityMatch, isNotEligible } from '@/lib/matchScore';
import { OpportunityEventType } from '@fresherflow/types';
import { OfflineError } from '@/lib/api/client';
import { ProfileCompletionBanner } from '@/components/dashboard/DashboardBanners';
import { Button } from '@/components/ui/Button';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardTabs } from './components/DashboardTabs';
import { DashboardFeed } from './components/DashboardFeed';
import { DashboardPulse } from './components/DashboardPulse';

// ── Dashboard feed cache ─────────────────────────────────────────────────────
const DASH_CACHE_KEY = 'ff_dashboard_cache_v1';
const HIGHLIGHTS_CACHE_KEY = 'ff_dashboard_highlights_cache_v1';
const DASH_CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheFresh(savedAt?: number | null) {
    return typeof savedAt === 'number' && (Date.now() - savedAt) < DASH_CACHE_TTL_MS;
}

function readDashCacheMeta(): { opportunities: Opportunity[]; savedAt: number | null } {
    if (typeof window === 'undefined') return { opportunities: [], savedAt: null };
    try {
        const raw = localStorage.getItem(DASH_CACHE_KEY);
        if (!raw) return { opportunities: [], savedAt: null };
        const parsed = JSON.parse(raw) as { opportunities?: Opportunity[]; savedAt?: number };
        return {
            opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null,
        };
    } catch {
        return { opportunities: [], savedAt: null };
    }
}

function writeDashCache(opportunities: Opportunity[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ opportunities, savedAt: Date.now() }));
    } catch { /* ignore quota */ }
}

function readHighlightsCache(): { data: HighlightsData | null; savedAt: number | null } {
    if (typeof window === 'undefined') return { data: null, savedAt: null };
    try {
        const raw = localStorage.getItem(HIGHLIGHTS_CACHE_KEY);
        if (!raw) return { data: null, savedAt: null };
        const parsed = JSON.parse(raw) as { data?: HighlightsData; savedAt?: number };
        return {
            data: parsed.data ?? null,
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null,
        };
    } catch {
        return { data: null, savedAt: null };
    }
}

function writeHighlightsCache(data: HighlightsData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(HIGHLIGHTS_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
    } catch { /* ignore quota */ }
}
// ─────────────────────────────────────────────────────────────────────────────

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;
const MOBILE_DASHBOARD_LIMIT = 10;
const MOBILE_DASHBOARD_STEP = 10;

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

const hasAppliedAction = (opp: Opportunity): boolean =>
    (opp.actions as { actionType: string }[] | undefined)?.some((a) => 
        ['APPLIED', 'PLANNED', 'INTERVIEWED', 'SELECTED', 'PLANNING', 'ATTENDED'].includes(a.actionType)
    ) ?? false;

export default function DashboardClient() {
    const { user, profile, isLoading: authLoading } = useAuth();
    const [recentOpps, setRecentOpps] = useState<Opportunity[]>(() => readDashCacheMeta().opportunities);
    const [isLoadingOpps, setIsLoadingOpps] = useState<boolean>(() => !isCacheFresh(readDashCacheMeta().savedAt));
    const [highlights, setHighlights] = useState<HighlightsData | null>(() => readHighlightsCache().data);
    const [, setIsLoadingHighlights] = useState(() => !isCacheFresh(readHighlightsCache().savedAt));
    const [hasLoaded, setHasLoaded] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [highlightsError, setHighlightsError] = useState<string | null>(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [dashboardVisitCounter, setDashboardVisitCounter] = useState(0);
    const [activeTab, setActiveTab] = useState<TabKey>('featured');
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_DASHBOARD_LIMIT);

    useEffect(() => {
        setMobileVisibleCount(MOBILE_DASHBOARD_LIMIT);
    }, [activeTab]);

    const loadRecentOpportunities = useCallback(async (options?: { force?: boolean }) => {
        const cached = readDashCacheMeta();
        if (!options?.force && isCacheFresh(cached.savedAt) && cached.opportunities.length > 0) {
            setRecentOpps(cached.opportunities);
            setIsLoadingOpps(false);
            return;
        }
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
        }
    }, []);

    const loadHighlights = useCallback(async (options?: { force?: boolean }) => {
        const cached = readHighlightsCache();
        if (!options?.force && isCacheFresh(cached.savedAt) && cached.data) {
            setHighlights(cached.data);
            setIsLoadingHighlights(false);
            return;
        }
        setHighlightsError(null);
        try {
            const data = await dashboardApi.getHighlights() as HighlightsData;
            setHighlights(data);
            writeHighlightsCache(data);
        } catch (err: unknown) {
            if (err instanceof OfflineError) return;
            setHighlightsError((err as Error)?.message || 'Unable to load highlights');
        } finally {
            setIsLoadingHighlights(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user && (profile?.completionPercentage ?? 0) >= 100 && !hasLoaded) {
            setHasLoaded(true);
            void Promise.allSettled([
                loadRecentOpportunities(),
                loadHighlights(),
            ]);
        }
    }, [authLoading, user, profile, hasLoaded, loadRecentOpportunities, loadHighlights]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleScroll = () => setShowBackToTop(window.scrollY > 420);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !user) return;
        const visitStorageKey = 'ff_dashboard_visit_counter';
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
        void loadRecentOpportunities({ force: true });
        void loadHighlights({ force: true });
    };

    const { activeItems, totalActive, jobsCount, internshipsCount, walkinsCount, latestBadgeCount } = useMemo(() => {
        const rotateByOffset = <T,>(items: T[], offset: number) => {
            if (items.length <= 1) return items;
            const norm = ((offset % items.length) + items.length) % items.length;
            return norm === 0 ? items : [...items.slice(norm), ...items.slice(0, norm)];
        };
        const uniqueById = (items: Opportunity[]) => {
            const seen = new Set<string>();
            return items.filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
        };

        const active = recentOpps
            .filter(o => !o.expiresAt || new Date(o.expiresAt) > new Date())
            .map(opp => {
                const match = calculateOpportunityMatch(profile, opp);
                return { ...opp, matchScore: match.score, matchReason: match.reason };
            });

        const latestSorted = [...active].sort((a, b) => {
            if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;
            return new Date(b.postedAt as string | Date).getTime() - new Date(a.postedAt as string | Date).getTime();
        });

        const bestMatch = rotateByOffset(
            [...active].sort((a, b) => {
                if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;
                return (b.matchScore || 0) - (a.matchScore || 0);
            }),
            Math.max(0, dashboardVisitCounter - 1) * 4
        );

        const closing = active
            .filter(o => o.expiresAt)
            .sort((a, b) => {
                if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;
                return new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime();
            })
            .slice(0, 8);

        const newIn24h = latestSorted
            .filter(o => (Date.now() - new Date(o.postedAt as string | Date).getTime()) <= HOURS_24_IN_MS)
            .slice(0, 10);
        const driveFeatured = uniqueById(
            (highlights?.driveMilestones || []).map((milestone) => milestone.opportunity)
        ).filter((opp) => !opp.expiresAt || new Date(opp.expiresAt) > new Date());
        const newSinceLastVisit = (highlights?.newSinceLastVisit || []).filter(o => !o.expiresAt || new Date(o.expiresAt) > new Date());

        const archived = recentOpps.filter(o => o.status === 'ARCHIVED' || (!!o.expiresAt && new Date(o.expiresAt) <= new Date()));
        const applied = recentOpps.filter(o =>
            (o.actions || []).some(action =>
                ['APPLIED', 'PLANNED', 'INTERVIEWED', 'SELECTED', 'PLANNING', 'ATTENDED'].includes(action.actionType)
            )
        );

        const featured = uniqueById([
            ...newSinceLastVisit,
            ...driveFeatured,
            ...closing,
            ...newIn24h,
            ...bestMatch,
        ]);
        const latestCount = highlights?.newSinceLastVisitCount ?? newSinceLastVisit.length ?? newIn24h.length;

        const tabMap: Record<TabKey, Opportunity[]> = {
            featured, latest: latestSorted, expiring: closing, all: bestMatch, applied, archived
        };
        const currentItems = tabMap[activeTab] || featured;

        return {
            activeItems: currentItems,
            totalActive: active.length || 1,
            jobsCount: active.filter(o => o.type === 'JOB').length,
            internshipsCount: active.filter(o => o.type === 'INTERNSHIP').length,
            walkinsCount: active.filter(o => o.type === 'WALKIN').length,
            latestBadgeCount: latestCount,
        };
    }, [recentOpps, highlights, dashboardVisitCounter, profile, activeTab]);

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
                    <DashboardHeader userName={user?.fullName?.split(' ')[0]} />

                    <div className="space-y-6 md:space-y-8">
                        <div className="space-y-3 md:space-y-6">
                            <ProfileCompletionBanner />
                            {(recentError || highlightsError) && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="text-xs text-foreground">Data sync issues. Browse existing listings.</div>
                                    <Button variant="outline" onClick={retryAll} className="h-8 px-3 text-[10px] border-primary/30 text-primary">Retry</Button>
                                </div>
                            )}

                            <DashboardTabs 
                                tabs={tabs}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                latestBadgeCount={latestBadgeCount}
                            />

                            <DashboardFeed 
                                isLoading={isLoadingOpps}
                                opportunities={activeItems}
                                onToggleSave={toggleSave}
                                isAdmin={user?.role === 'ADMIN'}
                                hasAppliedAction={hasAppliedAction}
                                mobileVisibleCount={mobileVisibleCount}
                                setMobileVisibleCount={setMobileVisibleCount}
                                mobileStep={MOBILE_DASHBOARD_STEP}
                            />
                        </div>

                        <DashboardPulse 
                            jobsCount={jobsCount}
                            internshipsCount={internshipsCount}
                            walkinsCount={walkinsCount}
                            totalActive={totalActive}
                        />
                    </div>
                </div>
                {showBackToTop && (
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-24 md:bottom-8 right-4 z-40 h-10 px-3 rounded-full border border-border bg-card/95 shadow-sm text-xs md:text-sm font-bold uppercase tracking-wider text-foreground hover:border-primary/40 hover:text-primary transition-all"
                        aria-label="Back to top"
                    >
                        Top
                    </button>
                )}
            </ProfileGate>
        </AuthGate>
    );
}
