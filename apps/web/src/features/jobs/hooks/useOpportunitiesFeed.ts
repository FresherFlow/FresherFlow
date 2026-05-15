import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Opportunity } from '@fresherflow/types';
// WEB PIVOT: keep API imports disabled while public web runs from CDN/static JSON.
// import { opportunitiesApi, savedApi } from '@/lib/api/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { readFeedCache, saveFeedCache } from '@/lib/offline/opportunitiesFeedCache';
import { calculateOpportunityMatch, isNotEligible } from '@/lib/matchScore';
import { enqueueOfflineSaveToggle } from '@/lib/offline/actionQueue';
import { useSiteMode } from '@/contexts/SiteModeContext';
import { filterOpportunitiesForSiteMode } from '@/lib/opportunityMode';

const WEB_STATIC_DISCOVERY = true;

interface UseOpportunitiesFeedOptions {
    type?: string | null;
    selectedLoc?: string | null;
    selectedYear?: number | null;
    showOnlySaved: boolean;
    closingSoon: boolean;
    search: string;
    minSalary?: number | null;
    maxSalary?: number | null;
    initialData?: {
        opportunities: Opportunity[];
        total: number;
        cachedAt?: number;
    } | null;
}

type OpportunityAction = {
    actionType: string;
};

export function useOpportunitiesFeed({
    type,
    selectedLoc,
    selectedYear,
    showOnlySaved,
    closingSoon,
    search,
    minSalary,
    maxSalary,
    initialData
}: UseOpportunitiesFeedOptions) {
    const { user, profile, isLoading: authLoading } = useAuth();
    const { mode } = useSiteMode();

    // Compute the initial cache scope synchronously
    const normalizedType = (type || 'all').toLowerCase();
    const initialCacheScope = `type:${normalizedType}`;

    const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
        if (initialData?.opportunities) return initialData.opportunities;
        if (typeof window === 'undefined') return [];
        if (showOnlySaved) return [];
        const cached = readFeedCache(initialCacheScope);
        return cached?.opportunities || [];
    });
    const [totalCount, setTotalCount] = useState<number>(() => {
        if (initialData?.total !== undefined) return initialData.total;
        if (typeof window === 'undefined') return 0;
        if (showOnlySaved) return 0;
        const cached = readFeedCache(initialCacheScope);
        return cached?.count || cached?.opportunities?.length || 0;
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (initialData?.opportunities) return false;
        if (typeof window === 'undefined') return true;
        if (showOnlySaved) return true;
        const cached = readFeedCache(initialCacheScope);
        return !cached?.opportunities?.length;
    });
    const [error, setError] = useState<string | null>(null);
    const [usingCachedFeed, setUsingCachedFeed] = useState<boolean>(() => !!initialData);
    const [cachedAt, setCachedAt] = useState<number | null>(() => {
        if (initialData?.cachedAt) return initialData.cachedAt;
        if (typeof window === 'undefined') return null;
        if (showOnlySaved) return null;
        return readFeedCache(initialCacheScope)?.cachedAt || null;
    });
    const [profileIncomplete, setProfileIncomplete] = useState<{ percentage: number; message: string } | null>(null);
    const lastRequestTimestamp = useRef(0);
    const opportunitiesCountRef = useRef(opportunities.length);
    const debouncedSearch = useDebounce(search, 500);
    const normalizedSearch = debouncedSearch.trim();
    const shouldUseBackendSearch = normalizedSearch.length >= 2;
    const cacheScope = useMemo(() => {
        return `type:${(type || 'all').toLowerCase()}`;
    }, [type]);

    useEffect(() => {
        opportunitiesCountRef.current = opportunities.length;
    }, [opportunities.length]);

    const loadOpportunities = useCallback(async (pageNum = 1, append = false) => {
        if (WEB_STATIC_DISCOVERY) {
            if (showOnlySaved) {
                setError('Saved jobs are available in the mobile app.');
                setOpportunities([]);
                setTotalCount(0);
                setIsLoading(false);
                return;
            }

            const staticOpps = initialData?.opportunities || readFeedCache(cacheScope)?.opportunities || [];
            setOpportunities(staticOpps);
            setTotalCount(initialData?.total ?? staticOpps.length);
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
            interface FeedResponse {
                opportunities: Opportunity[];
                total?: number;
                count?: number;
                limit?: number;
            }
            let data: FeedResponse;
            if (showOnlySaved) {
                if (!user) {
                    setError('Please log in to view saved opportunities');
                    setOpportunities([]);
                    setTotalCount(0);
                    setIsLoading(false);
                    return;
                }
                throw new Error('Saved jobs are disabled on web');
                // data = (await savedApi.list()) as FeedResponse;
                if (type) {
                    data.opportunities = data.opportunities?.filter((opp: Opportunity) => opp.type === type) || [];
                }
            } else if (shouldUseBackendSearch) {
                throw new Error('Backend search is disabled on web');
                // const searchData = (await opportunitiesApi.search({
                //     q: normalizedSearch,
                //     type: type || undefined,
                //     city: selectedLoc || undefined,
                //     page: pageNum,
                //     limit: 50,
                // })) as FeedResponse & { hits?: Opportunity[]; totalHits?: number; hasMore?: boolean };
                const searchData = { hits: [], totalHits: 0, total: 0, limit: 0, hasMore: false };
                data = {
                    opportunities: searchData.hits || [],
                    total: searchData.totalHits ?? searchData.total ?? (searchData.hits?.length || 0),
                    limit: searchData.limit,
                };
                if (lastRequestTimestamp.current === timestamp) {
                    setHasMore(Boolean(searchData.hasMore));
                }
            } else {
                throw new Error('Opportunity API list is disabled on web');
                // data = (await opportunitiesApi.list({
                //     type: type || undefined,
                //     city: selectedLoc || undefined,
                //     minSalary: minSalary || undefined,
                //     maxSalary: maxSalary || undefined,
                //     closingSoon: closingSoon || undefined,
                //     page: pageNum,
                //     limit: user ? 50 : 200
                // })) as FeedResponse;
                data = { opportunities: [], total: 0, limit: 0 };
            }

            // Freshness check: only update if this is the most recent request
            if (lastRequestTimestamp.current !== timestamp) return;

            const newOpps = data.opportunities || [];
            setOpportunities(prev => append ? [...prev, ...newOpps] : newOpps);
            if (typeof data.total === 'number' || typeof data.count === 'number') {
                setTotalCount(data.total || data.count || 0);
            } else if (append) {
                setTotalCount(prev => prev + newOpps.length);
            } else {
                setTotalCount(newOpps.length);
            }
            if (!shouldUseBackendSearch) {
                setHasMore(newOpps.length >= (data.limit || 50));
            }
            setPage(pageNum);

            if (!showOnlySaved && !shouldUseBackendSearch && pageNum === 1) {
                saveFeedCache(newOpps, data.total || data.count || newOpps.length, cacheScope);
                setCachedAt(Date.now());
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
                if (cached && !showOnlySaved && !shouldUseBackendSearch && pageNum === 1) {
                    // Silently fall back to cache — no toast, user doesn't need to know
                    setOpportunities(cached.opportunities);
                    setTotalCount(cached.count || cached.opportunities.length);
                    setUsingCachedFeed(true);
                    setCachedAt(cached.cachedAt);
                    setHasMore(false);
                } else if (!showOnlySaved) {
                    // No cache available — only then show error
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
    }, [type, selectedLoc, user, authLoading, showOnlySaved, minSalary, maxSalary, closingSoon, cacheScope, normalizedSearch, shouldUseBackendSearch, initialData]);

    useEffect(() => {
        if (!authLoading) {
            // If we have initial data, we already rendered. 
            // We only need to trigger a background sync if we're not searching
            // or if the initial data is old.
            const hasInitialData = !!initialData?.opportunities?.length;
            if (hasInitialData && !shouldUseBackendSearch) {
                // Background sync (SWR)
                loadOpportunities(1, false);
            } else {
                loadOpportunities();
            }
        }
    }, [loadOpportunities, authLoading, user, showOnlySaved, !!initialData]);

    const filteredOpps = useMemo(() => {
        const modeFiltered = filterOpportunitiesForSiteMode(opportunities, mode);

        const filtered = modeFiltered.filter(opp => {
            const matchesSearch = !normalizedSearch || [
                opp.title,
                opp.normalizedRole,
                opp.company,
                opp.description,
            ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch.toLowerCase()));

            const matchesLoc = !selectedLoc || (opp.locations || []).some((loc) => loc.toLowerCase().includes(selectedLoc.toLowerCase()));

            const matchesClosingSoon = !closingSoon || (() => {
                if (!opp.expiresAt) return false;
                const expiryDate = new Date(opp.expiresAt);
                const now = new Date();
                const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                return expiryDate >= now && expiryDate <= threeDaysFromNow;
            })();

            const matchesSalary = (!minSalary || (opp.salaryMax && opp.salaryMax >= minSalary) || (opp.salaryMin && opp.salaryMin >= minSalary)) &&
                (!maxSalary || (opp.salaryMin && opp.salaryMin <= maxSalary));

            const matchesYear = !selectedYear || (opp.allowedPassoutYears || []).includes(selectedYear);

            return matchesSearch && matchesLoc && matchesClosingSoon && matchesSalary && matchesYear;
        });

        const enriched = filtered.map((opp) => {
            const match = calculateOpportunityMatch(profile, opp);
            return {
                ...opp,
                matchScore: match.score,
                matchReason: match.reason,
            };
        });

        const bucketWeight = (opp: Opportunity & { isSaved?: boolean; actions?: OpportunityAction[] }) => {
            const isApplied = Array.isArray(opp.actions) && opp.actions.some((a: OpportunityAction) => a.actionType === 'APPLIED');
            if (isApplied) return 2;
            if (opp.isSaved) return 1;
            return 0;
        };

        return enriched.sort((a, b) => {
            // Not-eligible jobs always go to the bottom
            if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;

            const bucketDiff = bucketWeight(a) - bucketWeight(b);
            if (bucketDiff !== 0) return bucketDiff;

            const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
            if (scoreDiff !== 0) return scoreDiff;

            const postedA = new Date(a.postedAt || 0).getTime();
            const postedB = new Date(b.postedAt || 0).getTime();
            if (postedA !== postedB) return postedB - postedA;

            return (a.id || '').localeCompare(b.id || '');
        });
    }, [opportunities, selectedLoc, selectedYear, closingSoon, minSalary, maxSalary, profile, mode, normalizedSearch]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            toast.error('Saved jobs are available in the mobile app');
            return;
        }

        // OPTIMISTIC UPDATE: Update UI immediately
        const previousState = [...opportunities];
        const newSavedState = !opportunities.find(o => o.id === opportunityId)?.isSaved;

        setOpportunities(prev => prev.map(opp =>
            opp.id === opportunityId
                ? { ...opp, isSaved: newSavedState }
                : opp
        ));

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            enqueueOfflineSaveToggle(opportunityId, user.id);
            toast.success(`Saved update queued for sync.`);
            return;
        }

        // Background sync
        try {
            throw new Error('Saved jobs are disabled on web');
            // const result = await savedApi.toggle(opportunityId) as { saved: boolean };
            const result = { saved: newSavedState };

            // Verify sync result matches optimistic state
            if (result.saved !== newSavedState) {
                setOpportunities(prev => prev.map(opp =>
                    opp.id === opportunityId
                        ? { ...opp, isSaved: result.saved }
                        : opp
                ));
            }

            if (result.saved) {
                import('@/lib/api/client').then(({ growthApi }) => {
                    growthApi.trackEvent('SAVE_JOB', 'opportunity_feed').catch(() => undefined);
                });
            }
        } catch (err: unknown) {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                enqueueOfflineSaveToggle(opportunityId, user.id);
                toast.success('Saved update queued for sync.');
                return;
            }
            // ROLLBACK: Revert to previous state on error
            setOpportunities(previousState);
            const { getErrorMessage } = await import('@/lib/utils/error');
            toast.error(getErrorMessage(err) || 'Failed to update bookmark');
        }
    };

    return {
        opportunities,
        filteredOpps,
        totalCount,
        page,
        hasMore,
        isLoading,
        error,
        usingCachedFeed,
        cachedAt,
        profileIncomplete,
        toggleSave,
        setOpportunities,
        reload: () => loadOpportunities(1, false),
        loadMore: () => hasMore && !isLoading && loadOpportunities(page + 1, true),
    };
}
