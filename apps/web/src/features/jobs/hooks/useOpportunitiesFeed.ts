import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Opportunity, EducationLevel } from '@fresherflow/types';
// WEB PIVOT: keep API imports disabled while public web runs from CDN/static JSON.
// import { opportunitiesApi, savedApi } from '@/lib/api/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/lib/auth/AuthContext';
import toast from 'react-hot-toast';
import { readFeedCache, saveFeedCache } from '@/lib/cache/opportunitiesFeedCache';
import { fetchFullFeedOnClient } from '@/lib/api/cdnFeed';
import { calculateOpportunityMatch, isNotEligible } from '@/features/jobs/domain/matchScore';
import { useProfileFilterPrefs, getActiveProfileChips, deriveProfileFilterChips } from '@/features/jobs/hooks/useProfileFilters';
import { isStaleWalkin, isGovernmentOpportunity, matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';
export { isStaleWalkin };

import { useFirebaseSaved } from '@/features/dashboard/hooks/useSavedJobs';
import { promptLoginToast } from '@/lib/utils/toastUtils';
import { liveSearch, liveJobToOpportunity, type LiveSearchJob } from '@/features/jobs/api/liveSearch';
import { opportunityMatchesSearch, sanitizeSearchQuery } from '@/features/jobs/utils/searchUtils';
import { filterOpportunities } from '@/features/jobs/utils/filterOpportunities';


const WEB_STATIC_DISCOVERY = true;

import { getAtsName } from '../utils/atsSource';
export { getAtsName };


interface UseOpportunitiesFeedOptions {
    type?: string | null;
    mode?: string[] | string | null;
    source?: string[];
    company?: string[] | null;
    sort?: string | null;
    selectedLoc?: string | null;
    selectedYear?: number | null;
    showOnlySaved: boolean;
    closingSoon: boolean;
    search: string;
    sector?: string | null;
    qualification?: string | null;
    course?: string | null;
    skills?: string[] | null;
    roles?: string[] | null;
    experience?: string[] | null;
    minSalary?: number | null;
    maxSalary?: number | null;
    /** Apply the signed-in profile preferences as visible feed filters. */
    personalize?: boolean;
    initialData?: {
        opportunities: Opportunity[];
        total: number;
        cachedAt?: number;
    } | null;
}

export function useOpportunitiesFeed({
    type,
    mode,
    source,
    company,
    sort,
    selectedLoc,
    selectedYear,
    showOnlySaved,
    closingSoon,
    search,
    sector,
    qualification,
    course,
    skills,
    roles,
    experience,
    initialData,
    personalize = false,
}: UseOpportunitiesFeedOptions) {
    const router = useRouter();
    const { user, profile, isLoading: authLoading } = useAuth();
    const { prefs: profileFilterPrefs } = useProfileFilterPrefs();
    // Reveal toggle for the "N don't match your profile" disclosure row.
    const [showHiddenProfile, setShowHiddenProfile] = useState(false);
    // Signed-in preferences minus whatever the user switched off are the
    // profile filters this feed applies — never silently.
    const activeProfileChips = useMemo(
        () => (personalize ? getActiveProfileChips(profile, profileFilterPrefs) : []),
        [personalize, profile, profileFilterPrefs],
    );
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
        if (initialData?.opportunities) return initialData.opportunities;
        return [];
    });
    const [totalCount, setTotalCount] = useState<number>(() => {
        if (initialData?.total !== undefined) return initialData.total;
        return 0;
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (initialData?.opportunities) return false;
        return true;
    });
    const [error, setError] = useState<string | null>(null);
    const [usingCachedFeed, setUsingCachedFeed] = useState<boolean>(() => !!initialData);
    const [cachedAt, setCachedAt] = useState<number | null>(() => {
        if (initialData?.cachedAt) return initialData.cachedAt;
        return null;
    });
    const [profileIncomplete, setProfileIncomplete] = useState<{ percentage: number; message: string } | null>(null);
    const lastRequestTimestamp = useRef(0);
    const opportunitiesCountRef = useRef(opportunities.length);
    // Holds the fully-hydrated feed (fetched post-paint via /api/public/feed) so
    // auth/search driven re-runs of loadOpportunities never clobber the list
    // back to the server-rendered first page (the "stuck at 20 jobs" bug).
    const fullFeedRef = useRef<Opportunity[] | null>(null);
    const debouncedSearch = useDebounce(search, 500);
    const normalizedSearch = sanitizeSearchQuery(debouncedSearch);
    // Live fan-out (POST /api/search, 60s scraper timeout) is NEVER driven by
    // debounced keystrokes. Keystrokes filter the already-hydrated in-memory
    // CDN index client-side via opportunityMatchesSearch in filteredOpps below
    // (zero network). The fan-out fires only via submitLiveSearch() (explicit
    // form submit / Enter) or when no local scope is loaded (no-scope fallback).
    const [liveResults, setLiveResults] = useState<Opportunity[] | null>(null);
    const [isLiveSearching, setIsLiveSearching] = useState(false);
    const [liveSearchError, setLiveSearchError] = useState<string | null>(null);
    const liveRequestIdRef = useRef(0);
    // Query the live overlay (or live error) corresponds to. Non-null means a
    // live search is active for that query; keystrokes that diverge from it
    // revert to local-first filtering.
    const liveQueryRef = useRef<string | null>(null);
    const cacheScope = useMemo(() => {
        return `type:${(type || 'all').toLowerCase()}`;
    }, [type]);

    useEffect(() => {
        opportunitiesCountRef.current = opportunities.length;
    }, [opportunities.length]);

    const loadOpportunities = useCallback(async (pageNum = 1, append = false) => {
        if (WEB_STATIC_DISCOVERY) {
            if (showOnlySaved && !user) {
                setError('Please log in to view saved opportunities');
                setOpportunities([]);
                setTotalCount(0);
                setIsLoading(false);
                return;
            }

            // Prefer the hydrated full feed — never regress to the first page.
            const staticOpps = fullFeedRef.current
                ?? initialData?.opportunities
                ?? readFeedCache(cacheScope)?.opportunities
                ?? [];
            setOpportunities(staticOpps);
            setTotalCount(Math.max(staticOpps.length, initialData?.total ?? 0));
            setPage(1);
            setHasMore(false);
            setError(null);
            setProfileIncomplete(null);
            setIsLoading(false);
            return;
        }

        if (authLoading) return;
        const timestamp = Date.now();
        lastRequestTimestamp.current = timestamp;

        const shouldShowBlockingLoader = !append && pageNum === 1 && opportunitiesCountRef.current === 0;
        if (shouldShowBlockingLoader) {
            setIsLoading(true);
        }
        setProfileIncomplete(null);
        setError(null);
        setUsingCachedFeed(false);

        try {
            if (showOnlySaved) {
                if (!user) {
                    setError('Please log in to view saved opportunities');
                    setOpportunities([]);
                    setTotalCount(0);
                    setIsLoading(false);
                    return;
                }
                throw new Error('Saved jobs are disabled on web');
            } else {
                throw new Error('Opportunity API list is disabled on web');
            }
        } catch (err: unknown) {
            if (lastRequestTimestamp.current !== timestamp) return;
            const errorObj = err as { code?: string; completionPercentage?: number; message?: string };
            if (errorObj.code === 'PROFILE_INCOMPLETE') {
                setProfileIncomplete({
                    percentage: errorObj.completionPercentage || 0,
                    message: errorObj.message || 'Complete your profile to access job listings'
                });
            } else {
                const cached = readFeedCache(cacheScope);
                if (cached && !showOnlySaved && pageNum === 1) {
                    setOpportunities(cached.opportunities);
                    setTotalCount(cached.count || cached.opportunities.length);
                    setUsingCachedFeed(true);
                    setCachedAt(cached.cachedAt);
                    setHasMore(false);
                } else if (!showOnlySaved) {
                    const { getErrorMessage } = await import('@/lib/utils/error');
                    const msg = getErrorMessage(err);
                    setError(msg);
                }
            }
        } finally {
            if (lastRequestTimestamp.current === timestamp) {
                setIsLoading(false);
            }
        }
    }, [user, authLoading, showOnlySaved, cacheScope, initialData]);

    // Explicit live fan-out runner. Race-guarded by request id so a slow
    // fan-out never clobbers results for a newer query.
    const runLiveSearch = useCallback(async (query: string, requestId: number) => {
        const locationHint = selectedLoc || undefined;
        setIsLiveSearching(true);
        setLiveSearchError(null);
        try {
            // Live concurrent fan-out search across all scrapers
            const result = await liveSearch({
                searchTerm: query,
                location: locationHint,
                resultsWanted: 100,
            });

            if (liveRequestIdRef.current !== requestId) return;

            const convertedJobs = (result.jobs || []).map((j: LiveSearchJob) => liveJobToOpportunity(j) as unknown as Opportunity);
            setLiveResults(convertedJobs);
        } catch (err: unknown) {
            if (liveRequestIdRef.current !== requestId) return;
            const { getErrorMessage } = await import('@/lib/utils/error');
            setLiveSearchError(getErrorMessage(err));
            setLiveResults(null);
        } finally {
            if (liveRequestIdRef.current === requestId) {
                setIsLiveSearching(false);
            }
        }
    }, [selectedLoc]);

    // Explicit submit only (form submit / Enter key). Uses the current input
    // so it feels instant; debounced keystrokes keep filtering locally.
    const submitLiveSearch = useCallback(() => {
        const query = sanitizeSearchQuery(search);
        if (query.length < 2) return;
        liveRequestIdRef.current += 1;
        liveQueryRef.current = query;
        void runLiveSearch(query, liveRequestIdRef.current);
    }, [search, runLiveSearch]);

    const clearLiveSearch = useCallback(() => {
        liveRequestIdRef.current += 1;
        liveQueryRef.current = null;
        setLiveResults(null);
        setLiveSearchError(null);
        setIsLiveSearching(false);
    }, []);

    // Keystrokes after an explicit submit revert to local-first filtering:
    // once the debounced query diverges from the live query, drop the overlay.
    useEffect(() => {
        if (liveResults !== null && !isLiveSearching && normalizedSearch !== liveQueryRef.current) {
            setLiveResults(null);
            setLiveSearchError(null);
            liveQueryRef.current = null;
        }
    }, [normalizedSearch, liveResults, isLiveSearching]);

    // No-scope fallback: the only auto fan-out. Fires when the local index has
    // nothing loaded for this scope (no SSR slice, no hydrated feed) — once per
    // query. With a loaded scope, debounced queries stay purely local.
    const hasLocalScope = opportunities.length > 0 || fullFeedRef.current !== null;
    const hasInitialDataForScope = !!initialData;
    useEffect(() => {
        if (normalizedSearch.length < 2 || liveResults !== null || isLiveSearching) return;
        if (hasLocalScope || hasInitialDataForScope) return;
        if (liveQueryRef.current === normalizedSearch) return;
        liveRequestIdRef.current += 1;
        liveQueryRef.current = normalizedSearch;
        void runLiveSearch(normalizedSearch, liveRequestIdRef.current);
    }, [normalizedSearch, liveResults, isLiveSearching, hasLocalScope, hasInitialDataForScope, runLiveSearch]);

    const hasOpportunities = !!initialData?.opportunities?.length;
    const hasInitialData = !!initialData;
    useEffect(() => {
        if (!authLoading) {
            if (hasOpportunities) {
                loadOpportunities(1, false);
            } else {
                loadOpportunities();
            }
        }
    }, [loadOpportunities, authLoading, user, showOnlySaved, hasOpportunities, hasInitialData]);

    // Route components serialize only the first page of the feed into the HTML
    // (view-source stays light), so when the server-trimmed list is smaller
    // than the route total, hydrate the rest once after paint via the
    // same-origin /api/public/feed proxy. One request per scope per session.
    const hydratedScopeRef = useRef<string | null>(null);
    const latestFilterStateRef = useRef({ search: '', savedOnly: false });
    useEffect(() => {
        latestFilterStateRef.current = { search: normalizedSearch, savedOnly: showOnlySaved };
    }, [normalizedSearch, showOnlySaved]);

    const needsHydration = !initialData || initialData.opportunities.length < (initialData.total ?? 0);
    useEffect(() => {
        if (!WEB_STATIC_DISCOVERY || !needsHydration) return;

        const scope = type === 'GOVERNMENT' ? 'GOVERNMENT' : 'ALL';
        if (fullFeedRef.current || hydratedScopeRef.current === scope) return;

        let cancelled = false;
        void fetchFullFeedOnClient(scope).then((feed) => {
            if (cancelled || !feed?.opportunities?.length) return;
            hydratedScopeRef.current = scope;
            fullFeedRef.current = feed.opportunities;

            // A search or saved-only view owns the list by now — never clobber it.
            const latest = latestFilterStateRef.current;
            if (latest.savedOnly || latest.search.length > 0) return;

            const count = feed.count || feed.opportunities.length;
            const generatedAt = new Date(feed.generatedAt).getTime();

            setOpportunities(feed.opportunities);
            setTotalCount(count);
            if (Number.isFinite(generatedAt)) setCachedAt(generatedAt);
            saveFeedCache(feed.opportunities, count, cacheScope);
        });

        return () => {
            cancelled = true;
        };
    }, [cacheScope, initialData, needsHydration, type]);

    const { list: filteredOpps, profileMismatchCount, hiddenProfileCount } = useMemo(() => {
        // Live overlay active (explicit submit / no-scope fallback): rank the
        // fan-out results. The query was already applied server-side, so the
        // local token predicate is bypassed — all other filters still apply.
        const isLiveOverlay = liveResults !== null;
        const modeFiltered = isLiveOverlay ? liveResults : opportunities;

        const filtered = filterOpportunities(modeFiltered, {
            showOnlySaved,
            savedIds: savedJobsMap,
            sort,
            type,
            mode,
            source,
            selectedLoc,
            closingSoon,
            sector,
            qualification,
            course,
            selectedYear,
            skills,
            roles,
            experience,
            company,
            debouncedSearch,
            isLiveOverlay,
        });

        const enriched = filtered.map((opp) => {
            const match = calculateOpportunityMatch(profile, opp);
            return {
                ...opp,
                isSaved: !!savedJobsMap[opp.id],
                isEligible: match.isEligible,
                matchScore: match.score,
                matchReason: match.reason,
            };
        });

        // Profile narrowing lives in the URL now: seeded preferences become
        // `?location=` / `?mode=` / `?year=` and render as ordinary chips, so
        // this layer only owns what a URL can't express — demoting not-eligible
        // jobs — plus the disclosure count that makes that visible.
        const layerOn = personalize && profileFilterPrefs.enabled;
        const mismatchCount = layerOn ? enriched.filter((opp) => isNotEligible(opp)).length : 0;
        const base = enriched;

        if (!isMounted) {
            return { list: base, profileMismatchCount: mismatchCount, hiddenProfileCount: 0 };
        }

        const now = Date.now();
        const sortKeys = new Map(enriched.map(opp => [
            opp.id,
            {
                expiresAt: opp.expiresAt ? new Date(opp.expiresAt).getTime() : Infinity,
                postedAt: opp.postedAt ? new Date(opp.postedAt).getTime() : 0,
            }
        ]));

        const sorted = base.sort((a, b) => {
            const keysA = sortKeys.get(a.id)!;
            const keysB = sortKeys.get(b.id)!;

            // 1. Expired opportunities always go to the absolute bottom
            const isExpiredA = keysA.expiresAt < now;
            const isExpiredB = keysB.expiresAt < now;
            if (isExpiredA !== isExpiredB) return isExpiredA ? 1 : -1;

            // 2. Not-eligible jobs sink to the bottom — unless the user hit
            //    "show them" on the disclosure row, which un-hides the list.
            if (layerOn && !showHiddenProfile && isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;

            // 3. Sort override
            if (sort === 'expiring') {
                const expA = keysA.expiresAt;
                const expB = keysB.expiresAt;
                if (expA !== expB) return expA - expB;
            } else if (sort === 'latest') {
                const timeA = keysA.postedAt;
                const timeB = keysB.postedAt;
                if (timeB !== timeA) return timeB - timeA;
            } else if (sort === 'trending') {
                const trendA = (a as unknown as Record<string, unknown>).views || (a as unknown as Record<string, unknown>).applicationsCount || a.matchScore || 0;
                const trendB = (b as unknown as Record<string, unknown>).views || (b as unknown as Record<string, unknown>).applicationsCount || b.matchScore || 0;
                if ((trendB as number) !== (trendA as number)) return (trendB as number) - (trendA as number);
            } else if (sort === 'match') {
                // Match sort: sort by match score descending
                const scoreA = a.matchScore ?? 0;
                const scoreB = b.matchScore ?? 0;
                if (scoreB !== scoreA) return scoreB - scoreA;

                // Tie-breaker: newer first
                const timeA = keysA.postedAt;
                const timeB = keysB.postedAt;
                if (timeB !== timeA) return timeB - timeA;
            } else {
                // 4. Mobile Architecture: Recency priority (newer postedAt date comes first)
                const timeA = keysA.postedAt;
                const timeB = keysB.postedAt;

                const diff = Math.abs(timeB - timeA);
                if (diff > 24 * 60 * 60 * 1000) {
                    return timeB - timeA;
                }

                // Match score tie-breaker for postings within the same 24h window
                const scoreA = a.matchScore ?? 0;
                const scoreB = b.matchScore ?? 0;
                if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                }

                if (timeB !== timeA) {
                    return timeB - timeA;
                }
            }

            // Universal deterministic secondary tie-breaker
            return a.id.localeCompare(b.id);
        });
        return {
            list: sorted,
            profileMismatchCount: mismatchCount,
            hiddenProfileCount: showHiddenProfile ? 0 : mismatchCount,
        };
    }, [opportunities, liveResults, selectedLoc, selectedYear, closingSoon, sector, qualification, course, skills, company, profile, normalizedSearch, type, mode, source, sort, showOnlySaved, savedJobsMap, isMounted, activeProfileChips, showHiddenProfile, profileFilterPrefs]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }
        try {
            await toggleSavedJob(opportunityId);
            toast.success(savedJobsMap[opportunityId] ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch {
            toast.error('Bookmark update failed');
        }
    };

    // Retry preserves the active source: a live overlay/error re-fans out,
    // otherwise the local index reloads.
    const reload = useCallback(() => {
        if (liveQueryRef.current && (liveResults !== null || liveSearchError)) {
            const query = liveQueryRef.current;
            liveRequestIdRef.current += 1;
            void runLiveSearch(query, liveRequestIdRef.current);
            return;
        }
        void loadOpportunities(1, false);
    }, [loadOpportunities, liveResults, liveSearchError, runLiveSearch]);

    return {
        opportunities,
        filteredOpps,
        totalCount,
        page,
        hasMore,
        isLoading: isLoading || isLiveSearching,
        error: error ?? liveSearchError,
        usingCachedFeed,
        cachedAt,
        profileIncomplete,
        toggleSave,
        setOpportunities,
        reload,
        loadMore: () => hasMore && !isLoading && loadOpportunities(page + 1, true),
        // Explicit live fan-out controls. Keystrokes never call these —
        // wire submitLiveSearch to form submit / Enter key only.
        submitLiveSearch,
        clearLiveSearch,
        isLiveSearching,
        liveSearchError,
        isLiveResults: liveResults !== null,
        // Profile-filter disclosure: how many jobs the profile layer hides or
        // demotes right now, and the reveal switch behind it.
        profileMismatchCount,
        hiddenProfileCount,
        // `isMounted` guards are load-bearing, not defensive. `profile` comes
        // from `useAuth()`, so it is empty during SSR and populated on the
        // client. Without the guard the chip counts are 0 on the server and >0
        // on the first client render, and the Active Chips row appears where
        // the server emitted nothing — a hydration mismatch. `profileMismatchCount`
        // below is already guarded the same way inside the memo.
        profileChipCount: isMounted ? activeProfileChips.length : 0,
        // Every chip the profile would apply, switched on or off — the header
        // must be able to SHOW the personalization layer even while it is paused.
        profileChipTotal: isMounted ? deriveProfileFilterChips(profile).length : 0,
        showHiddenProfile,
        setShowHiddenProfile,
        // Draft-match counter inputs (mobile filter sheet live count). The
        // sheet runs the shared predicate with draft values; these are the
        // current values it also needs. Additive only.
        savedIds: savedJobsMap,
        draftBaseInputs: {
            debouncedSearch,
            liveResults,
            activeProfileChips,
            showHiddenProfile,
            profileLayerOn: personalize && profileFilterPrefs.enabled,
        },
    };
}
