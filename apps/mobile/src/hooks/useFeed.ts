import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Opportunity, OpportunityType, OpportunityListResponse, Profile } from '@fresherflow/types';
import { opportunitiesApi, getInferredBaseUrl } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import { saveFeedCache, readFeedCache, getLastSyncTimestamp, saveLastSyncTimestamp } from '@/utils/offlineCache';
import { diffAndNotify } from '@/utils/localNotifications';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';

// Global tracker to prevent multiple tabs from syncing at the same time
let globalLastSyncTimestamp = 0;

export const useFeed = (initialFeedType: string | null = null) => {
    const { user, profile: authProfile } = useAuth();
    useNotifications();
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);

    // Smart Sync Logic: Update only statuses/expiries without full re-fetch
    const performSync = useCallback(async (force = false) => {
        // Throttle: Don't sync more than once every 60 seconds across all hook instances
        const now = Date.now();
        if (!force && now - globalLastSyncTimestamp < 60000) return;
        globalLastSyncTimestamp = now;

        try {
            const since = await getLastSyncTimestamp();
            const response = await opportunitiesApi.sync(since || undefined);
            
            if (response.updates && response.updates.length > 0) {
                console.log(`[useFeed] Syncing ${response.updates.length} updates...`);
                setJobs(prev => {
                    const updateMap = new Map(response.updates.map(u => [u.id, u]));
                    
                    // Update existing jobs, filter out deleted ones
                    const updatedJobs = prev.map(job => {
                        const update = updateMap.get(job.id);
                        if (update) {
                            return { ...job, ...update };
                        }
                        return job;
                    }).filter(job => !job.deletedAt && job.status !== 'ARCHIVED');

                    void saveFeedCache(updatedJobs);
                    return updatedJobs;
                });
            }
            
            await saveLastSyncTimestamp(response.timestamp);
        } catch (e) {
            console.warn('[useFeed] Smart sync failed', e);
        }
    }, []);

    // Sync local profile for scoring
    useEffect(() => {
        const syncProfile = async () => {
            const p = await getLocalProfile();
            setLocalProfile(p || authProfile);
        };
        void syncProfile();
    }, [authProfile]);
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
                await diffAndNotify(opportunities);
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
                
                // Only fetch fresh data in background if cache is older than 5 minutes
                const isCacheStale = (Date.now() - cached.timestamp) > 5 * 60 * 1000;
                if (isCacheStale) {
                    void fetchJobs(true, true);
                } else {
                    // Even if cache is fresh, do a lightweight status sync
                    void performSync();
                }
            } else {
                void fetchJobs(true, false);
                initialLoadDone.current = true;
            }
        };
        void loadInitialCache();
    }, [performSync]);

    useFocusEffect(
        useCallback(() => {
            // Run a lightweight sync when the screen comes into focus
            void performSync();
        }, [performSync])
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
        } else if (feedType === 'trending') {
            // Simple Trending wiring: Use trendingScore if available, else calculate simple engagement score
            result = [...result].sort((a, b) => {
                const scoreA = a.trendingScore || ((a.sharesCount || 0) * 5 + (a.savesCount || 0) * 3 + (a.clicksCount || 0));
                const scoreB = b.trendingScore || ((b.sharesCount || 0) * 5 + (b.savesCount || 0) * 3 + (b.clicksCount || 0));
                return scoreB - scoreA;
            });
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (job: Opportunity) =>
                    job.title.toLowerCase().includes(lowerQuery) ||
                    job.company.toLowerCase().includes(lowerQuery),
            );
        }

        // Sink Expired to Bottom (Task 11, Item 7)
        const now = new Date();
        const active = result.filter(j => !j.expiresAt || new Date(j.expiresAt) > now);
        const expired = result.filter(j => j.expiresAt && new Date(j.expiresAt) <= now);
        
        const combined = [...active, ...expired];

        // Add Local Match Scoring
        return combined.map(job => {
            if (!localProfile) return job;
            
            const match = calculateMatchScore(localProfile, job);
            return {
                ...job,
                matchScore: match.score,
                matchReason: match.reason,
                isEligible: match.isEligible
            };
        });
    }, [jobs, searchQuery, activeFilter, feedType, localProfile]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchJobs(true, true);
        void performSync(true);
    }, [fetchJobs, performSync]);

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
        profile: localProfile,
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
