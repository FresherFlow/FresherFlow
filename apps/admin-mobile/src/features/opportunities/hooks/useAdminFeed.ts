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
  const fetchingRef = useRef(false);

  const fetchJobs = useCallback(async (opts: { pg?: number; force?: boolean; query?: string } = {}) => {
    const { pg = 1, query = activeQuery } = opts;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (pg === 1) setLoading(true); else setLoadingMore(true);
      setError(null);
      const params = {
        page: pg,
        limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
        status: 'PUBLISHED' as const,
        ...(query.trim() ? { search: query.trim() } : {}),
      };
      
      const data = await adminOpportunitiesApi.list(params as any) as { opportunities: Opportunity[], total: number };
      const rows = data.opportunities ?? [];
      
      if (pg === 1) {
        setJobs(rows);
        setTotal(data.total || rows.length);
        setActiveQuery(query.trim());
        await AsyncStorage.setItem(
          ADMIN_OPPORTUNITIES_CACHE_KEY,
          JSON.stringify({ cachedAt: Date.now(), opportunities: rows, query: query.trim() }),
        );
      } else {
        setJobs(prev => {
          const seen = new Set(prev.map((j: Opportunity) => j.id));
          return [...prev, ...rows.filter((r: Opportunity) => !seen.has(r.id))];
        });
      }
      setPage(pg);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, [activeQuery]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore) {
      void fetchJobs({ pg: page + 1 });
    }
  }, [loading, loadingMore, page, fetchJobs]);

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
