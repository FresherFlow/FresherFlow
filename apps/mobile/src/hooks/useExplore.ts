import { useState, useCallback, useEffect, useRef } from 'react';
import { opportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
// @ts-expect-error lodash/debounce typing
import debounce from 'lodash/debounce';
import { readFeedCache } from '@/utils/offlineCache';

import { OpportunityType, WorkMode } from '@fresherflow/types';

export interface ExploreFilters {
    type: OpportunityType | null;
    workMode: WorkMode | null;
    batchYear: number | null;
    tag: string | null;
    sort: 'latest' | 'trending' | 'closing_soon';
}

export function useExplore() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<ExploreFilters>({
        type: null,
        workMode: null,
        batchYear: null,
        tag: null,
        sort: 'latest',
    });

    // Cache loading
    useEffect(() => {
        const loadCache = async () => {
            const cached = await readFeedCache();
            if (cached && cached.items.length > 0) {
                setResults(cached.items.slice(0, 20));
            }
        };
        void loadCache();
    }, []);

    const lastParams = useRef<string>('');

    const fetchResults = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params: Record<string, string | number | boolean> = {
                limit: 20,
            };

            if (filters.type) params.type = filters.type;

            // Map workMode and batchYear to feedType if needed by API
            if (filters.workMode === 'REMOTE') params.feedType = 'remote';
            if (filters.batchYear) params.feedType = String(filters.batchYear);

            // Sort
            if (filters.sort === 'trending') params.sort = 'trending';
            if (filters.sort === 'closing_soon') params.closingSoon = true;

            let response;
            if (searchQuery.trim().length > 0) {
                params.q = searchQuery.trim();
                response = await (opportunitiesApi.search as (p: typeof params) => Promise<unknown>)(params);
            } else {
                response = await (opportunitiesApi.list as (p: typeof params) => Promise<unknown>)(params);
            }

            const res = response as Record<string, unknown>;

            if (searchQuery.trim().length > 0) {
                // Search response returns { hits: [] }
                if (response && Array.isArray(res.hits)) {
                    setResults(res.hits);
                } else if (Array.isArray(response)) {
                    setResults(response);
                }
            } else {
                // List response returns { opportunities: [] }
                if (response && Array.isArray(res.opportunities)) {
                    setResults(res.opportunities);
                } else if (Array.isArray(response)) {
                    setResults(response);
                }
            }
        } catch (error) {
            console.error('Explore fetch failed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, filters]);

    // Debounced search
    const debouncedFetch = useCallback(
        debounce(() => {
            void fetchResults();
        }, 500),
        [fetchResults]
    );

    useEffect(() => {
        const currentParams = JSON.stringify({ searchQuery, filters });
        if (currentParams !== lastParams.current) {
            lastParams.current = currentParams;
            if (searchQuery.trim().length > 0) {
                void debouncedFetch();
            } else {
                void fetchResults();
            }
        }
    }, [searchQuery, filters, debouncedFetch, fetchResults]);

    const onRefresh = useCallback(() => {
        void fetchResults(true);
    }, [fetchResults]);

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
        loading,
        refreshing,
        onRefresh,
        filters,
        setFilters: updateFilter,
        resetFilters,
        searchQuery,
        setSearchQuery,
    };
}
