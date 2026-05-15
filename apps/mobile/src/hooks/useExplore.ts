import { useState, useCallback, useMemo, useEffect } from 'react';
import { Opportunity, OpportunityType, WorkMode } from '@fresherflow/types';
import { opportunitiesApi } from '@fresherflow/api-client';
import { readFeedCache, getLastSyncTimestamp, saveLastSyncTimestamp } from '@/utils/offlineCache';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import Fuse from 'fuse.js';

export interface ExploreFilters {
    type: OpportunityType | null;
    workMode: WorkMode | null;
    batchYear: number | null;
    tag: string | null;
    sort: 'latest' | 'trending' | 'closing_soon';
}

export function useExplore() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filters, setFilters] = useState<ExploreFilters>({
        type: null,
        workMode: null,
        batchYear: null,
        tag: null,
        sort: 'latest',
    });

    const queryClient = useQueryClient();
    
    // Premium Debounce via Lodash
    const updateDebouncedQuery = useMemo(
        () => debounce((q: string) => setDebouncedSearchQuery(q), 500),
        []
    );

    useEffect(() => {
        updateDebouncedQuery(searchQuery);
        return () => updateDebouncedQuery.cancel();
    }, [searchQuery, updateDebouncedQuery]);

    const queryKey = ['explore', debouncedSearchQuery, filters];

    const {
        data: rawResults = [],
        isLoading,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            // Strictly Offline: Read from the local persistent pool
            const cache = await readFeedCache();
            
            if (!cache || !cache.items) return [] as Opportunity[];

            let items = cache.items;

            // Apply Filters Locally
            if (filters.type) {
                if (filters.type === OpportunityType.REMOTE) {
                    // WIRE FROM FEED: Handle Remote Only category by checking both type and workMode
                    items = items.filter(j => j.workMode === 'REMOTE' || j.type === OpportunityType.REMOTE);
                } else {
                    items = items.filter(j => j.type === filters.type);
                }
            }

            if (filters.tag) {
                const tag = filters.tag;
                // WIRE FROM FEED: Detect "XXXX Batch" tags and filter by year
                const batchMatch = tag.match(/(\d{4})\s*Batch/i);
                if (batchMatch) {
                    const year = parseInt(batchMatch[1]);
                    items = items.filter(j => j.allowedPassoutYears?.includes(year));
                } else {
                    items = items.filter(j => j.tags?.includes(tag) || j.jobFunction === tag);
                }
            }

            if (filters.workMode) {
                items = items.filter(j => j.workMode === filters.workMode);
            }

            if (filters.batchYear) {
                items = items.filter(j => j.allowedPassoutYears?.includes(filters.batchYear!));
            }

            // Apply Sorting Locally
            if (filters.sort === 'trending') {
                items = [...items].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
            } else if (filters.sort === 'closing_soon') {
                items = items.filter(j => j.expiresAt).sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
            } else {
                items = [...items].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
            }

            return items;
        },
        staleTime: Infinity, // MANUAL REFRESH ONLY: Never auto-refetch
        placeholderData: keepPreviousData, // WIRE FROM FEED: Don't blank out while typing
    });

    const onRefresh = useCallback(async () => {
        // WIRE FROM 1: Only perform the real sync on manual pull-to-refresh
        try {
            const since = await getLastSyncTimestamp();
            const syncResponse = await opportunitiesApi.sync(since || undefined);
            
            if (syncResponse.updates && syncResponse.updates.length > 0) {
                // Invalidate main feed so it also sees the new jobs
                void queryClient.invalidateQueries({ queryKey: ['feed'] });
                await saveLastSyncTimestamp(syncResponse.timestamp);
            }
        } catch (e) {
            console.warn('[useExplore] Manual sync failed', e);
        }
        await refetch();
    }, [queryClient, refetch]);

    // Fuse.js Indexing - Only rebuild when data changes, not on every keystroke
    const fuseIndex = useMemo(() => {
        if (rawResults.length === 0) return null;
        return new Fuse(rawResults, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
            distance: 100,
        });
    }, [rawResults]);

    // Fast fuzzy searching using the pre-built index
    const results = useMemo(() => {
        if (!debouncedSearchQuery.trim() || !fuseIndex) return rawResults;
        return fuseIndex.search(debouncedSearchQuery).map(r => r.item);
    }, [fuseIndex, debouncedSearchQuery, rawResults]);

    const updateFilter = useCallback((newFilters: Partial<ExploreFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            type: null,
            workMode: null,
            batchYear: null,
            tag: null,
            sort: 'latest',
        });
        setSearchQuery('');
    }, []);

    return {
        results,
        loading: isLoading,
        refreshing: isRefetching,
        onRefresh,
        filters,
        setFilters: updateFilter,
        resetFilters,
        searchQuery,
        setSearchQuery,
    };
}
