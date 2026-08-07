'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { calculateOpportunityMatch, isNotEligible } from '@/features/opportunities/domain/matchScore';
import { OpportunityEventType } from '@fresherflow/types';
import { ProfileCompletionBanner } from '@/features/dashboard/components/DashboardBanners';
import { Button } from '@/ui/Button';
import { calculateProfileCompletion } from '@/features/profile/profileCompletion';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { readFeedCache, saveFeedCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { useFirebaseTracker } from '@/lib/hooks/useFirebaseTracker';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import Link from 'next/link';
import {
    BriefcaseIcon,
    BookmarkIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Input } from '@/ui/Input';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardTabs } from './components/DashboardTabs';
import { DashboardFeed } from './components/DashboardFeed';


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

function computeHighlights(opportunities: Opportunity[]): HighlightsData {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expiringOpps = opportunities.filter(o => {
        if (!o.expiresAt) return false;
        const exp = new Date(o.expiresAt);
        return exp > now && exp < fortyEightHoursFromNow;
    });

    const walkins = expiringOpps.filter(o => o.type === 'WALKIN');
    const others = expiringOpps.filter(o => o.type !== 'WALKIN');

    const newlyAdded = opportunities.filter(o => {
        if (!o.postedAt) return false;
        const posted = new Date(o.postedAt);
        return posted > twentyFourHoursAgo;
    });

    let lastVisit = twentyFourHoursAgo;
    if (typeof window !== 'undefined') {
        const lastVisitStr = window.localStorage.getItem('ff_last_dashboard_visit');
        if (lastVisitStr) {
            const parsed = parseInt(lastVisitStr, 10);
            if (!isNaN(parsed)) {
                lastVisit = new Date(parsed);
            }
        }
    }
    const newSinceLastVisit = opportunities.filter(o => {
        if (!o.postedAt) return false;
        const posted = new Date(o.postedAt);
        return posted > lastVisit;
    });

    const driveEventTypes = [
        'NOTIFICATION',
        'REG_START',
        'REG_END',
        'EXAM_DATE',
        'RESULT',
    ];
    const upcomingEvents: any[] = [];
    opportunities.forEach(opp => {
        if (opp.events && Array.isArray(opp.events)) {
            opp.events.forEach(evt => {
                const evtDate = new Date(evt.eventDate);
                if (
                    driveEventTypes.includes(evt.eventType) &&
                    evtDate >= new Date(now.getTime() - 6 * 60 * 60 * 1000) &&
                    evtDate <= new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
                ) {
                    upcomingEvents.push({
                        ...evt,
                        opportunity: opp
                    });
                }
            });
        }
    });

    const seenDriveIds = new Set<string>();
    const driveMilestones: DriveMilestone[] = upcomingEvents
        .filter((item) => {
            if (seenDriveIds.has(item.opportunityId)) return false;
            seenDriveIds.add(item.opportunityId);
            return true;
        })
        .sort((a, b) => {
            const aPriority = /tcs/i.test(a.opportunity?.company || '') && /nqt/i.test(a.opportunity?.title || '') ? 1 : 0;
            const bPriority = /tcs/i.test(b.opportunity?.company || '') && /nqt/i.test(b.opportunity?.title || '') ? 1 : 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        })
        .slice(0, 4)
        .map((item) => ({
            opportunityId: item.opportunityId,
            eventId: item.id,
            eventType: item.eventType,
            eventDate: new Date(item.eventDate).toISOString(),
            eventTitle: item.title,
            opportunity: item.opportunity,
        }));

    if (driveMilestones.length === 0) {
        const fallbackDrive = opportunities.find(o => 
            o.title.toLowerCase().includes('nqt') && 
            (!o.expiresAt || new Date(o.expiresAt) > now)
        );
        if (fallbackDrive) {
            driveMilestones.push({
                opportunityId: fallbackDrive.id,
                eventId: `fallback-${fallbackDrive.id}`,
                eventType: OpportunityEventType.NOTIFICATION,
                eventDate: typeof fallbackDrive.postedAt === 'string' ? fallbackDrive.postedAt : new Date(fallbackDrive.postedAt).toISOString(),
                eventTitle: 'Drive update available',
                opportunity: fallbackDrive,
            });
        }
    }

    return {
        urgent: {
            walkins: walkins.slice(0, 3),
            others: others.slice(0, 3)
        },
        newlyAdded: newlyAdded.slice(0, 3),
        newSinceLastVisit: newSinceLastVisit.slice(0, 6),
        newSinceLastVisitCount: newSinceLastVisit.length,
        driveMilestones
    };
}

import { Card, CardContent } from '@/ui/Card';

interface DashboardStatsProps {
    savedCount: number;
    trackerCount: number;
}

function DashboardStats({ savedCount, trackerCount }: DashboardStatsProps) {
    return (
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link href="/saved" className="group">
                <Card className="hover:border-primary/40 transition-all duration-150 ease-out active:scale-[0.97] hover:shadow-sm cursor-pointer border-border/60 bg-card/80 backdrop-blur-sm">
                    <CardContent className="px-3.5 py-2 flex items-center gap-2.5">
                        <div className="p-1.5 w-fit rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
                            <BookmarkIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Wishlist</p>
                            <p className="text-base font-black text-foreground leading-tight mt-0.5">{savedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/tracker" className="group">
                <Card className="hover:border-primary/40 transition-all duration-150 ease-out active:scale-[0.97] hover:shadow-sm cursor-pointer border-border/60 bg-card/80 backdrop-blur-sm">
                    <CardContent className="px-3.5 py-2 flex items-center gap-2.5">
                        <div className="p-1.5 w-fit rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                            <BriefcaseIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Applied</p>
                            <p className="text-base font-black text-foreground leading-tight mt-0.5">{trackerCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}

export default function DashboardClient({ initialData }: { initialData?: { opportunities: Opportunity[]; total?: number; count?: number; cachedAt?: number } | null } = {}) {
    const { user, profile, isLoading: authLoading } = useAuth();
    const profileCompletion = calculateProfileCompletion(profile).percentage;
    const [recentOpps, setRecentOpps] = useState<Opportunity[]>(() => {
        if (initialData?.opportunities && Array.isArray(initialData.opportunities)) {
            const sanitized = initialData.opportunities.slice(0, 60).map((o: Opportunity) => ({
                ...o,
                locations: o.locations || [],
                requiredSkills: o.requiredSkills || []
            }));
            return sanitized;
        }
        return readFeedCache('type:all')?.opportunities || [];
    });
    const [isLoadingOpps, setIsLoadingOpps] = useState<boolean>(!(initialData?.opportunities && initialData.opportunities.length > 0));
    const [highlights, setHighlights] = useState<HighlightsData | null>(() => {
        if (initialData?.opportunities && Array.isArray(initialData.opportunities) && profileCompletion >= 100) {
            return computeHighlights(initialData.opportunities);
        }
        return null;
    });
    const [, setIsLoadingHighlights] = useState<boolean>(!(initialData?.opportunities && initialData.opportunities.length > 0));

    useEffect(() => {
        if (profileCompletion >= 100 && recentOpps.length > 0) {
            setHighlights(computeHighlights(recentOpps));
        }
    }, [profileCompletion, recentOpps]);

    const { trackerMap } = useFirebaseTracker(user?.id);
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);

    useEffect(() => {
        // Feed cache load logic removed, initialized in useState instead.
    }, []);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [highlightsError, setHighlightsError] = useState<string | null>(null);
    const [, setShowBackToTop] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (recentOpps.length > 0) {
            setRecentError(null);
            setHighlightsError(null);
        }
    }, [recentOpps.length]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [dashboardVisitCounter, setDashboardVisitCounter] = useState(0);
    const [activeTab, setActiveTab] = useState<TabKey>('featured');
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_DASHBOARD_LIMIT);
    useEffect(() => {
        setMobileVisibleCount(MOBILE_DASHBOARD_LIMIT);
    }, [activeTab]);

    const loadRecentOpportunities = useCallback(async (options?: { force?: boolean }) => {
        if (recentOpps.length > 0 && !options?.force) {
            saveFeedCache(recentOpps, recentOpps.length, 'type:all');
            if (profileCompletion >= 100 && !highlights) {
                setHighlights(computeHighlights(recentOpps));
            }
            setIsLoadingOpps(false);
            setIsLoadingHighlights(false);
            return;
        }
        setRecentError(null);
        setHighlightsError(null);
        try {
            const data = await fetchBootstrapFeed();
            if (!data || !Array.isArray(data.opportunities)) {
                throw new Error('Failed to fetch opportunities feed');
            }
            const sanitized = data.opportunities.slice(0, 60).map((o: Opportunity) => ({
                ...o,
                locations: o.locations || [],
                requiredSkills: o.requiredSkills || []
            }));
            setRecentOpps(sanitized);
            saveFeedCache(sanitized, sanitized.length, 'type:all');

            const computed = profileCompletion >= 100 ? computeHighlights(data.opportunities) : null;
            setHighlights(computed);
        } catch (err: unknown) {
            setRecentError((err as Error)?.message || 'Unable to load recommended listings');
            setHighlightsError((err as Error)?.message || 'Unable to load highlights');
        } finally {
            setIsLoadingOpps(false);
            setIsLoadingHighlights(false);
        }
    }, [recentOpps, highlights, profileCompletion]);

    useEffect(() => {
        if (!authLoading && user && !hasLoaded) {
            setHasLoaded(true);
            void loadRecentOpportunities();
        }
    }, [authLoading, user, hasLoaded, loadRecentOpportunities]);

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
        if (!user) {
            toast.error('Please log in to save opportunities');
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
        }
        try {
            await toggleSavedJob(opportunityId);
            toast.success(savedJobsMap[opportunityId] ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch {
            toast.error('Bookmark update failed');
        }
    };

    const retryAll = () => {
        setIsLoadingOpps(true);
        setIsLoadingHighlights(true);
        void loadRecentOpportunities({ force: true });
    };

    const recentOppsWithActions = useMemo(() => {
        return recentOpps.map(opp => {
            const trackerItem = trackerMap[opp.id];
            const isSaved = !!savedJobsMap[opp.id];
            const oppWithActions = { ...opp, isSaved };

            if (trackerItem) {
                oppWithActions.actions = [
                    {
                        id: `rtdb-${opp.id}`,
                        userId: user?.id || '',
                        opportunityId: opp.id,
                        actionType: trackerItem.status,
                        createdAt: new Date(trackerItem.updatedAt),
                    }
                ];
            }
            return oppWithActions;
        });
    }, [recentOpps, trackerMap, savedJobsMap, user?.id]);

    const { activeItems, latestBadgeCount } = useMemo(() => {
        const uniqueById = (items: Opportunity[]) => {
            const seen = new Set<string>();
            return items.filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
        };

        const modeRecentOpps = recentOppsWithActions;
        const modeDriveFeatured = uniqueById(
            (highlights?.driveMilestones || []).map((milestone) => milestone.opportunity)
        ).filter((opp) => !opp.expiresAt || new Date(opp.expiresAt) > new Date());
        const modeNewSinceLastVisit = (highlights?.newSinceLastVisit || [])
            .filter(o => !o.expiresAt || new Date(o.expiresAt) > new Date());

        const active = modeRecentOpps
            .filter(o => !o.expiresAt || new Date(o.expiresAt) > new Date())
            .map(opp => {
                const match = calculateOpportunityMatch(profile, opp);
                return { ...opp, matchScore: match.score, matchReason: match.reason };
            });

        // Mobile-aligned sorting function:
        // 1. Eligible jobs first
        // 2. Recency (postedAt) date descending - newest jobs ALWAYS come first
        // 3. Match score tie-breaker for postings within the same 24-hour window
        const mobileSortFeed = (a: Opportunity & { matchScore?: number }, b: Opportunity & { matchScore?: number }) => {
            const eligA = !isNotEligible(a);
            const eligB = !isNotEligible(b);
            if (eligA !== eligB) return eligA ? -1 : 1;

            const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;

            // Recency priority: If posting dates differ by more than 24 hours, newest date ALWAYS comes first!
            const diff = Math.abs(timeB - timeA);
            if (diff > 24 * 60 * 60 * 1000) {
                return timeB - timeA;
            }

            // Within same 24h window: sort by match score
            const scoreA = a.matchScore ?? 0;
            const scoreB = b.matchScore ?? 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }

            return timeB - timeA;
        };

        const latestSorted = [...active].sort((a, b) => {
            if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;
            return new Date(b.postedAt as string | Date).getTime() - new Date(a.postedAt as string | Date).getTime();
        });

        const bestMatch = [...active].sort(mobileSortFeed);

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
        const driveFeatured = modeDriveFeatured;
        const newSinceLastVisit = modeNewSinceLastVisit;

        const archived = modeRecentOpps.filter(o => o.status === 'ARCHIVED' || (!!o.expiresAt && new Date(o.expiresAt) <= new Date()));
        const applied = modeRecentOpps.filter(o =>
            (o.actions || []).some(action =>
                ['APPLIED', 'PLANNED', 'INTERVIEWED', 'SELECTED', 'PLANNING', 'ATTENDED'].includes(action.actionType)
            )
        );

        const rawFeatured = uniqueById([
            ...newSinceLastVisit,
            ...driveFeatured,
            ...newIn24h,
            ...bestMatch,
        ]) as (Opportunity & { matchScore?: number; matchReason?: string })[];
        
        // Hide ineligible jobs from featured and sort using mobileSortFeed
        const eligibleFeatured = rawFeatured.filter(o => !isNotEligible(o));
        const featured = [...eligibleFeatured].sort(mobileSortFeed);

        const latestCount = highlights?.newSinceLastVisitCount ?? newSinceLastVisit.length ?? newIn24h.length;

        const tabMap: Record<TabKey, Opportunity[]> = {
            featured, latest: latestSorted, expiring: closing, all: bestMatch, applied, archived
        };
        const currentItems = tabMap[activeTab] || featured;

        return { activeItems: currentItems, latestBadgeCount: latestCount };
    }, [recentOppsWithActions, highlights, profile, activeTab]);

    const filteredCurrentItems = useMemo(() => {
        if (!searchQuery.trim()) return activeItems;
        const q = searchQuery.trim().toLowerCase();
        return activeItems.filter(item => {
            const titleMatch = item.title?.toLowerCase().includes(q);
            const companyMatch = item.company?.toLowerCase().includes(q);
            const roleMatch = item.normalizedRole?.toLowerCase().includes(q);
            const skillMatch = item.requiredSkills?.some(s => s.toLowerCase().includes(q));
            const tagMatch = item.tags?.some(t => t.toLowerCase().includes(q));
            return titleMatch || companyMatch || roleMatch || skillMatch || tagMatch;
        });
    }, [activeItems, searchQuery]);

    const tabs: { key: TabKey; title: string }[] = [
        { key: 'featured', title: 'Featured' },
        { key: 'latest', title: 'Latest' },
        { key: 'expiring', title: 'Expiring Soon' },
        { key: 'all', title: 'All Jobs' },
        { key: 'applied', title: 'Applied' },
        { key: 'archived', title: 'Archived' },
    ];

    const showSyncError = !!((recentError || highlightsError) && recentOpps.length === 0);

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pt-4 md:pt-6 pb-12 md:pb-20 px-3 md:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 md:pb-4 border-b border-border/40">
                        <DashboardHeader userName={user?.fullName?.split(' ')[0]} />
                        <DashboardStats
                            savedCount={Object.keys(savedJobsMap).filter(k => savedJobsMap[k]).length}
                            trackerCount={Object.keys(trackerMap).length}
                        />
                    </div>

                    {showSyncError && (
                        <div className="w-full max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-center text-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded-xl">
                            <div className="text-xs text-foreground">Data sync issues. Browse existing listings.</div>
                            <Button variant="outline" onClick={retryAll} className="h-8 px-3 text-[10px] border-primary/30 text-primary">Retry</Button>
                        </div>
                    )}

                    <ProfileCompletionBanner />

                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <DashboardTabs
                                tabs={tabs}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                latestBadgeCount={latestBadgeCount}
                            />
                            <div className="relative w-full sm:w-72 shrink-0">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search role, company or skill..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card border-border shadow-xs w-full"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-150 ease-out active:scale-[0.97]"
                                        aria-label="Clear search"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <DashboardFeed
                            isLoading={isLoadingOpps}
                            opportunities={filteredCurrentItems}
                            onToggleSave={toggleSave}
                            isAdmin={user?.role === 'ADMIN'}
                            hasAppliedAction={hasAppliedAction}
                            mobileVisibleCount={mobileVisibleCount}
                            setMobileVisibleCount={setMobileVisibleCount}
                            mobileStep={MOBILE_DASHBOARD_STEP}
                            searchQuery={searchQuery}
                        />
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}

