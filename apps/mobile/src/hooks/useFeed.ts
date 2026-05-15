import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Opportunity, OpportunityType, OpportunityListResponse, Profile } from '@fresherflow/types';
import { useNotificationStore } from '@/store/useNotificationStore';
import { opportunitiesApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import { saveFeedCache, readFeedCache, getLastSyncTimestamp, saveLastSyncTimestamp } from '@/utils/offlineCache';
import { diffAndNotify } from '@/utils/localNotifications';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL } from '@/config/api';

// Global tracker to prevent multiple tabs from syncing at the same time
let globalLastSyncTimestamp = 0;

export const useFeed = (initialFeedType: string | null = null) => {
    const { user, profile: authProfile } = useAuth();
    useNotifications();
    const queryClient = useQueryClient();
    
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | OpportunityType>('ALL');
    const [activeCity, setActiveCity] = useState('ALL');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [feedType, setFeedType] = useState<string | null>(initialFeedType);
    const [cachedItems, setCachedItems] = useState<Opportunity[]>([]);

    // Sync local profile for scoring
    useEffect(() => {
        const syncProfile = async () => {
            const p = await getLocalProfile();
            setLocalProfile(p || authProfile);
        };
        void syncProfile();
    }, [authProfile]);

    // Instant Hydration from Offline Cache or CDN Bootstrap (Task 25)
    const [isBootstrapping, setIsBootstrapping] = useState(false);

    useEffect(() => {
        const hydrate = async () => {
            const cached = await readFeedCache();
            if (cached && cached.items.length > 0) {
                setCachedItems(cached.items);
                return;
            }

            // If empty (First Install), try ultra-fast CDN bootstrap
            setIsBootstrapping(true);
            try {
                const response = await axios.get(BOOTSTRAP_FEED_URL, { timeout: 3000 });
                if (response.data?.opportunities) {
                    setCachedItems(response.data.opportunities);
                }
            } catch (e) {
                console.log('[useFeed] Bootstrap fetch skipped/failed:', (e as Error).message);
            } finally {
                setIsBootstrapping(false);
            }
        };
        void hydrate();
    }, []);

    const queryKey = ['feed', activeFilter, activeCity, selectedTag, feedType];

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            const response = await opportunitiesApi.list({
                type: activeFilter === 'ALL' ? undefined : activeFilter,
                city: activeCity === 'ALL' ? undefined : activeCity,
                tag: selectedTag || undefined,
                feedType: feedType || undefined,
                page: pageParam as number,
            }) as OpportunityListResponse;

            const opportunities = response.opportunities || [];
            const profile = await getLocalProfile();
            
            // PRECOMPUTE: Score and Eligibility (Only if profile has meaningful data)
            const hasProfileData = profile && (
                (profile.skills && profile.skills.length > 0) ||
                (profile.preferredCities && profile.preferredCities.length > 0) ||
                (profile.interestedIn && profile.interestedIn.length > 0) ||
                profile.educationLevel
            );

            const scoredOpportunities = opportunities.map(job => {
                if (!hasProfileData) return job;
                const match = calculateMatchScore(profile, job);
                return {
                    ...job,
                    matchScore: match.score > 0 ? match.score : undefined,
                    matchReason: match.score > 0 ? match.reason : undefined,
                    isEligible: match.isEligible
                };
            });

            // Persistence side-effects (Atomic)
            if (pageParam === 1 && scoredOpportunities.length > 0) {
                void saveFeedCache(scoredOpportunities);
                void diffAndNotify(scoredOpportunities).then(() => {
                    // Trigger a store refresh so the bell dot updates immediately
                    void useNotificationStore.getState().fetchUnreadCount();
                });
            }

            return { ...response, opportunities: scoredOpportunities };
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loadedSoFar = allPages.reduce((acc, p) => acc + (p.opportunities?.length || 0), 0);
            return (lastPage.opportunities?.length > 0 && loadedSoFar < (lastPage.total || 0)) 
                ? allPages.length + 1 
                : undefined;
        },
        staleTime: 1000 * 60 * 5,
    });

    // Unified Data Source: Remote Data with Cache Fallback for instant render
    const jobs = useMemo(() => {
        const remoteData = data?.pages.flatMap(page => page.opportunities || []) || [];
        return remoteData.length > 0 ? remoteData : cachedItems;
    }, [data, cachedItems]);

    const totalResults = useMemo(() => {
        return data?.pages[0]?.total || jobs.length;
    }, [data, jobs.length]);

    // Smart Sync Logic
    const performSync = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - globalLastSyncTimestamp < 60000) return;
        globalLastSyncTimestamp = now;

        try {
            const since = await getLastSyncTimestamp();
            const response = await opportunitiesApi.sync(since || undefined);
            
            if (response.updates && response.updates.length > 0) {
                void queryClient.invalidateQueries({ queryKey });
            }
            
            await saveLastSyncTimestamp(response.timestamp);
        } catch (e) {
            console.warn('[useFeed] Smart sync failed', e);
        }
    }, [queryClient, queryKey]);

    useFocusEffect(
        useCallback(() => {
            void performSync();
        }, [performSync])
    );

    // Fuse.js Indexing - Only rebuild when data source actually changes
    const fuseIndex = useMemo(() => {
        if (jobs.length === 0) return null;
        return new Fuse(jobs, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
        });
    }, [jobs]);

    const filteredOpportunities = useMemo(() => {
        let result = jobs;

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
            result = [...result].sort((a, b) => {
                const scoreA = a.trendingScore || ((a.sharesCount || 0) * 5 + (a.savesCount || 0) * 3 + (a.clicksCount || 0));
                const scoreB = b.trendingScore || ((b.sharesCount || 0) * 5 + (b.savesCount || 0) * 3 + (b.clicksCount || 0));
                return scoreB - scoreA;
            });
        }

        if (searchQuery.trim() && fuseIndex) {
            result = fuseIndex.search(searchQuery).map(r => r.item);
        }

        // Final fast pass for active/expired separation
        const now = Date.now();
        const active: Opportunity[] = [];
        const expired: Opportunity[] = [];
        
        for (const j of result) {
            if (!j.expiresAt || new Date(j.expiresAt).getTime() > now) {
                active.push(j);
            } else {
                expired.push(j);
            }
        }
        
        return [...active, ...expired];
    }, [jobs, fuseIndex, searchQuery, activeFilter, feedType]);

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
        loading: isLoading,
        refreshing: isRefetching,
        loadingMore: isFetchingNextPage,
        error: error ? (error as Error).message : null,
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
        offlineMode: !!error,
        onRefresh: refetch,
        loadMore: () => {
            if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
            }
        },
        filteredOpportunities,
        clearFilters,
        hasActiveFilters,
        totalResults,
        hasMore: hasNextPage,
        isBootstrapping,
    };
};
