import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Opportunity } from '@fresherflow/types';
import { opportunitiesApi, savedApi } from '@/lib/api/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { readFeedCache, saveFeedCache } from '@/lib/offline/opportunitiesFeedCache';
import { calculateOpportunityMatch, isNotEligible } from '@/lib/matchScore';
import { enqueueOfflineSaveToggle } from '@/lib/offline/actionQueue';

interface UseOpportunitiesFeedOptions {
    type?: string | null;
    selectedLoc?: string | null;
    selectedYear?: number | null;
    showOnlySaved: boolean;
    closingSoon: boolean;
    search: string;
    minSalary?: number | null;
    maxSalary?: number | null;
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
}: UseOpportunitiesFeedOptions) {
    const { user, profile, isLoading: authLoading } = useAuth();

    // Compute the initial cache scope synchronously
    const normalizedType = (type || 'all').toLowerCase();
    const initialCacheScope = `type:${normalizedType}`;

    const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
        if (typeof window === 'undefined') return [];
        if (showOnlySaved) return [];
        const cached = readFeedCache(initialCacheScope);
        return cached?.opportunities || [];
    });
    const [totalCount, setTotalCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        if (showOnlySaved) return 0;
        const cached = readFeedCache(initialCacheScope);
        return cached?.count || cached?.opportunities?.length || 0;
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        if (showOnlySaved) return true;
        const cached = readFeedCache(initialCacheScope);
        return !cached?.opportunities?.length;
    });
    const [error, setError] = useState<string | null>(null);
    const [usingCachedFeed, setUsingCachedFeed] = useState<boolean>(false);
    const [cachedAt, setCachedAt] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        if (showOnlySaved) return null;
        return readFeedCache(initialCacheScope)?.cachedAt || null;
    });
    const [profileIncomplete, setProfileIncomplete] = useState<{ percentage: number; message: string } | null>(null);
    const lastRequestTimestamp = useRef(0);
    const opportunitiesCountRef = useRef(opportunities.length);
    const debouncedSearch = useDebounce(search, 300);
    const cacheScope = useMemo(() => {
        return `type:${(type || 'all').toLowerCase()}`;
    }, [type]);

    useEffect(() => {
        opportunitiesCountRef.current = opportunities.length;
    }, [opportunities.length]);

    const loadOpportunities = useCallback(async (pageNum = 1, append = false) => {
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
                data = (await savedApi.list()) as FeedResponse;
                if (type) {
                    data.opportunities = data.opportunities?.filter((opp: Opportunity) => opp.type === type) || [];
                }
            } else {
                data = (await opportunitiesApi.list({
                    type: type || undefined,
                    city: selectedLoc || undefined,
                    minSalary: minSalary || undefined,
                    maxSalary: maxSalary || undefined,
                    closingSoon: closingSoon || undefined,
                    page: pageNum
                })) as FeedResponse;
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
            setHasMore(newOpps.length >= (data.limit || 50));
            setPage(pageNum);

            if (!showOnlySaved && pageNum === 1) {
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
                if (cached && !showOnlySaved && pageNum === 1) {
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
    }, [type, selectedLoc, user, authLoading, showOnlySaved, minSalary, maxSalary, closingSoon, cacheScope]);

    useEffect(() => {
        if (!authLoading) {
            loadOpportunities();
        }
    }, [loadOpportunities, authLoading, user, showOnlySaved]);

    const filteredOpps = useMemo(() => {
        const filtered = opportunities.filter(opp => {
            const matchesSearch = !debouncedSearch ||
                opp.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                opp.company.toLowerCase().includes(debouncedSearch.toLowerCase());

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

            return a.id.localeCompare(b.id);
        });
    }, [opportunities, debouncedSearch, selectedLoc, selectedYear, closingSoon, minSalary, maxSalary, profile]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            toast.error('Please log in to save opportunities');
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
            const result = await savedApi.toggle(opportunityId) as { saved: boolean };

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
