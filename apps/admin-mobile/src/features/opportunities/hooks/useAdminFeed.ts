import { useState, useCallback, useRef } from 'react';
import { adminOpportunitiesApi, type Opportunity } from '@fresherflow/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_OPPORTUNITIES_CACHE_KEY, ADMIN_OPPORTUNITIES_PAGE_SIZE } from '../../../lib/constants';

export const useAdminFeed = () => {
  const [jobs, setJobs] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = useRef(false);

  const fetchJobs = useCallback(async (opts: { pg?: number; force?: boolean; query?: string } = {}) => {
    const { pg = 1, query = activeQuery } = opts;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (pg === 1) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const params = {
        page: pg,
        limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
        status: 'PUBLISHED' as const,
        ...(query.trim() ? { search: query.trim() } : {}),
      };
      
      const data = await adminOpportunitiesApi.list(params as Parameters<typeof adminOpportunitiesApi.list>[0]) as { opportunities: Opportunity[], total: number };
      const rows = data.opportunities ?? [];
      const currentTotal = data.total ?? 0;
      
      if (pg === 1) {
        setJobs(rows);
        setTotal(currentTotal);
        setActiveQuery(query.trim());
        setHasMore(rows.length > 0 && rows.length < currentTotal);
        await AsyncStorage.setItem(
          ADMIN_OPPORTUNITIES_CACHE_KEY,
          JSON.stringify({ cachedAt: Date.now(), opportunities: rows, query: query.trim() }),
        );
      } else {
        const seen = new Set(jobs.map((j: Opportunity) => j.id));
        const newJobs = rows.filter((r: Opportunity) => !seen.has(r.id));
        if (newJobs.length > 0) {
          setJobs(prev => [...prev, ...newJobs]);
        }
        setHasMore(rows.length > 0 && (jobs.length + newJobs.length) < currentTotal && newJobs.length > 0);
      }
      setPage(pg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch opportunities');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, [activeQuery, jobs]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      void fetchJobs({ pg: page + 1 });
    }
  }, [loading, loadingMore, hasMore, page, fetchJobs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchJobs({ pg: 1, force: true });
  }, [fetchJobs]);

  const handleSearch = useCallback(() => {
    void fetchJobs({ pg: 1, query: searchInput });
  }, [fetchJobs, searchInput]);

  return {
    jobs,
    total,
    loading,
    loadingMore,
    refreshing,
    searchInput,
    setSearchInput,
    activeQuery,
    error,
    fetchJobs,
    loadMore,
    onRefresh,
    handleSearch,
  };
};
