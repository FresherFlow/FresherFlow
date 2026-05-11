import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Opportunity, OpportunityType, OpportunityListResponse } from '@fresherflow/types';
import { opportunitiesApi, getInferredBaseUrl } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import { saveFeedCache, readFeedCache } from '@/utils/offlineCache';

export const useFeed = (initialFeedType: string | null = null) => {
    const { user, profile } = useAuth();
    useNotifications();
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | OpportunityType>('ALL');
    const [activeCity, setActiveCity] = useState('ALL');
    const [offlineMode, setOfflineMode] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [feedType, setFeedType] = useState<string | null>(initialFeedType);
    const [totalResults, setTotalResults] = useState(0);
    const fetchingRef = useRef(false);
    const initialLoadDone = useRef(false);

    const fetchJobs = useCallback(async (reset = false, silent = false, overridePage?: number) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        
        console.log(`[useFeed] fetching from: ${getInferredBaseUrl()} (Platform: ${Platform.OS})`);
        
        const currentPage = reset ? 1 : (overridePage ?? page);
        if (reset) {
            setPage(1);
            setHasMore(true);
        }
        
        if (!silent && currentPage === 1) setLoading(true);
        if (currentPage > 1) setLoadingMore(true);
        
        try {
            const data = await opportunitiesApi.list({
                type: activeFilter === 'ALL' ? undefined : activeFilter,
                city: activeCity === 'ALL' ? undefined : activeCity,
                tag: selectedTag || undefined,
                feedType: feedType || undefined,
                page: currentPage,
            }) as OpportunityListResponse;

            const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
            const responseTotal = data.total ?? 0;
            
            if (reset) {
                setJobs(opportunities);
                await saveFeedCache(opportunities);
                setHasMore(opportunities.length > 0 && (responseTotal === 0 || opportunities.length < responseTotal));
                setTotalResults(responseTotal || opportunities.length);
            } else {
                setJobs(prev => {
                    const existingIds = new Set(prev.map(j => j.id));
                    const newJobs = opportunities.filter(j => !existingIds.has(j.id));
                    const updated = [...prev, ...newJobs];
                    
                    setHasMore(opportunities.length > 0 && newJobs.length > 0 && (responseTotal === 0 || updated.length < responseTotal));
                    setTotalResults(responseTotal || updated.length);
                    
                    return updated;
                });
            }
            
            setOfflineMode(false);
            setError(null);
        } catch (err) {
            console.error('[useFeed] fetch failed:', err);
            setOfflineMode(true);
            setError(null);
            setHasMore(false);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            fetchingRef.current = false;
        }
    }, [activeFilter, activeCity, selectedTag, feedType, page]);

    const loadMore = useCallback(() => {
        if (!loading && !loadingMore && hasMore && !offlineMode && !fetchingRef.current) {
            const nextPage = page + 1;
            setPage(nextPage);
            void fetchJobs(false, true, nextPage);
        }
    }, [loading, loadingMore, hasMore, offlineMode, fetchJobs, page]);

    // Cache Loading Effect
    useEffect(() => {
        const loadInitialCache = async () => {
            const cached = await readFeedCache();
            if (cached && cached.items.length > 0) {
                setJobs(cached.items);
                setTotalResults(cached.items.length);
                setOfflineMode(false);
                initialLoadDone.current = true;
                
                // Only fetch fresh data in background if cache is older than 1 hour
                const isCacheStale = (Date.now() - cached.timestamp) > 60 * 60 * 1000;
                if (isCacheStale) {
                    void fetchJobs(true, true);
                }
            } else {
                void fetchJobs(true, false);
                initialLoadDone.current = true;
            }
        };
        void loadInitialCache();
    }, []);

    useFocusEffect(
        useCallback(() => {
            // Don't refetch on every focus to save bandwidth and preserve cache state
            // If the user wants fresh data, they can pull-to-refresh
        }, [])
    );

    const filteredOpportunities = useMemo(() => {
        let result = jobs;

        // Local Filter Wiring: Ensure UI responds immediately and remains consistent
        if (activeFilter !== 'ALL') {
            result = result.filter(j => j.type === activeFilter);
        }

        if (feedType === 'remote') {
            result = result.filter(j => j.workMode === 'REMOTE');
        } else if (feedType === '2026') {
            result = result.filter(j => j.allowedPassoutYears?.includes(2026));
        } else if (feedType === 'internships') {
            result = result.filter(j => j.type === 'INTERNSHIP');
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (job: Opportunity) =>
                    job.title.toLowerCase().includes(lowerQuery) ||
                    job.company.toLowerCase().includes(lowerQuery),
            );
        }
        return result;
    }, [jobs, searchQuery, activeFilter, feedType]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchJobs(true, true);
    }, [fetchJobs]);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setActiveFilter('ALL');
        setActiveCity('ALL');
        setSelectedTag(null);
        setFeedType(null);
    }, []);

    const hasActiveFilters = activeFilter !== 'ALL' || activeCity !== 'ALL' || searchQuery.trim().length > 0 || !!selectedTag || !!feedType;

    return {
        user,
        profile,
        opportunities: jobs,
        loading,
        refreshing,
        loadingMore,
        error,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        activeCity,
        setActiveCity,
        selectedTag,
        setSelectedTag,
        feedType,
        setFeedType,
        offlineMode,
        fetchJobs,
        onRefresh,
        loadMore,
        filteredOpportunities,
        clearFilters,
        hasActiveFilters,
        totalResults,
        hasMore,
    };

};
