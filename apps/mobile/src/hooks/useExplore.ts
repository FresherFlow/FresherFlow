import { useState, useCallback, useMemo, useEffect } from 'react';
import { Opportunity, OpportunityType, WorkMode } from '@fresherflow/types';
import { readFeedCache, saveFeedCache, saveLastSyncTimestamp } from '@/utils/offlineCache';
import { generateCdnSignature } from '@/utils/cdnSignature';
import debounce from 'lodash.debounce';
import Fuse from 'fuse.js';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL } from '@/config/api';
import { normalizeQuery } from '@/utils/text';
import { useUIStore } from '@/store/useUIStore';

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
    const filters = useUIStore(s => s.exploreFilters);
    const setFilters = useUIStore(s => s.setExploreFilters);
    const resetExploreFilters = useUIStore(s => s.resetExploreFilters);

    const [cachedItems, setCachedItems] = useState<Opportunity[]>([]);
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Debounce search query to prevent rebuilding index on every keystroke
    const updateDebouncedQuery = useMemo(
        () => debounce((q: string) => setDebouncedSearchQuery(q), 300),
        []
    );

    useEffect(() => {
        updateDebouncedQuery(searchQuery);
        return () => updateDebouncedQuery.cancel();
    }, [searchQuery, updateDebouncedQuery]);

    // 1. Client-First Hydration (Instant Render from Cache)
    const hydrate = useCallback(async () => {
        setIsBootstrapping(true);
        try {
            const cache = await readFeedCache();
            if (cache && cache.items.length > 0) {
                setCachedItems(cache.items);
            } else {
                // Generate secure signatures to bypass Cloudflare Worker block
                const sigParams = generateCdnSignature('/bootstrap-feed.min.json');

                // If cache is empty, bootstrap directly from CDN
                const response = await axios.get(BOOTSTRAP_FEED_URL, { 
                    timeout: 4000,
                    params: sigParams
                });
                if (response.data?.opportunities) {
                    const ops = response.data.opportunities as Opportunity[];
                    setCachedItems(ops);
                    await saveFeedCache(ops);
                }
            }
        } catch (e) {
            console.warn('[useExplore] Cache hydration failed:', (e as Error).message);
        } finally {
            setIsBootstrapping(false);
        }
    }, []);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    // 2. Dynamic Manual Pull-to-Refresh
    const onRefresh = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const sigParams = generateCdnSignature('/bootstrap-feed.min.json');

            const response = await axios.get(BOOTSTRAP_FEED_URL, { 
                timeout: 5000,
                params: sigParams,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.data?.opportunities) {
                const opportunities = response.data.opportunities as Opportunity[];
                setCachedItems(opportunities);
                await saveFeedCache(opportunities);
                await saveLastSyncTimestamp(response.data.timestamp || Date.now());
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            console.warn('[useExplore] CDN static sync failed:', errMsg);
            setSyncError(errMsg);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // 3. High-Speed Local Filter & Sort Pipeline (Parsed in <3ms)
    const rawResults = useMemo(() => {
        let items = cachedItems;

        // Apply Filters Locally
        if (filters.type) {
            if (filters.type === OpportunityType.REMOTE) {
                items = items.filter(j => j.workMode === 'REMOTE' || j.type === OpportunityType.REMOTE);
            } else {
                items = items.filter(j => j.type === filters.type);
            }
        }

        if (filters.tag) {
            const tag = filters.tag;
            const batchMatch = tag.match(/(\d{4})\s*Batch/i);
            if (batchMatch) {
                const year = parseInt(batchMatch[1]);
                items = items.filter(j => !j.allowedPassoutYears || j.allowedPassoutYears.length === 0 || j.allowedPassoutYears.includes(year));
            } else {
                items = items.filter(j => j.tags?.includes(tag) || j.jobFunction === tag);
            }
        }

        if (filters.workMode) {
            items = items.filter(j => j.workMode === filters.workMode);
        }

        if (filters.batchYear) {
            items = items.filter(j => !j.allowedPassoutYears || j.allowedPassoutYears.length === 0 || j.allowedPassoutYears.includes(filters.batchYear!));
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
    }, [cachedItems, filters]);

    // 4. Fuse.js Fuzzy Search Index
    const fuseIndex = useMemo(() => {
        if (rawResults.length === 0) return null;
        return new Fuse(rawResults, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
            distance: 100,
        });
    }, [rawResults]);

    // 5. In-Memory Search Engine & Suggestions
    const { results, suggestions } = useMemo(() => {
        const query = normalizeQuery(debouncedSearchQuery);
        if (!query || !fuseIndex) {
            return { results: rawResults, suggestions: [] };
        }
        
        const searchResults = fuseIndex.search(query).map(r => r.item);
        
        // Broader suggestions if exact search yields 0 results
        let fuzzySuggestions: Opportunity[] = [];
        if (searchResults.length === 0 && rawResults.length > 0) {
            const broaderFuse = new Fuse(rawResults, {
                keys: ['title', 'company', 'jobFunction'],
                threshold: 0.6,
            });
            fuzzySuggestions = broaderFuse.search(query).slice(0, 3).map(r => r.item);
        }
        
        return { results: searchResults, suggestions: fuzzySuggestions };
    }, [fuseIndex, debouncedSearchQuery, rawResults]);

    const resetFilters = useCallback(() => {
        resetExploreFilters();
        setSearchQuery('');
    }, [resetExploreFilters]);

    return {
        results,
        loading: isBootstrapping,
        refreshing: isSyncing,
        onRefresh,
        filters,
        setFilters,
        resetFilters,
        searchQuery,
        setSearchQuery,
        suggestions,
        isBootstrapping,
        error: syncError,
    };
}
