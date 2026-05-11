import { useState, useCallback, useEffect, useRef } from 'react';
import { opportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
// @ts-expect-error lodash/debounce typing
import debounce from 'lodash/debounce';

export interface ExploreFilters {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | null;
    workMode: 'REMOTE' | 'HYBRID' | 'ONSITE' | null;
    batchYear: number | null;
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
        sort: 'latest',
    });

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

            const data = (response as { success?: boolean; data?: Opportunity[] });
            if (data.success && Array.isArray(data.data)) {
                setResults(data.data);
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
