import { useState, useCallback, useMemo, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { ADMIN_OPPORTUNITIES_PAGE_SIZE } from '../../../lib/constants';

export const useAdminFeed = () => {
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin', 'opportunities', activeQuery],
    queryFn: ({ pageParam = 1 }) => 
      adminOpportunitiesApi.list({
        page: pageParam,
        limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
        status: 'PUBLISHED',
        ...(activeQuery.trim() ? { search: activeQuery.trim() } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((acc, p) => acc + (p.opportunities?.length || 0), 0);
      if (totalLoaded < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: summaryData } = useQuery({
    queryKey: ['admin', 'opportunities', 'summary'],
    queryFn: () => adminOpportunitiesApi.summary(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const jobs = useMemo(() => 
    data?.pages.flatMap(p => p.opportunities || []) ?? [], 
    [data]
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => setActiveQuery(val), 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchInput);
    return () => debouncedSearch.cancel();
  }, [searchInput, debouncedSearch]);

  const handleSearch = useCallback(() => {
    setActiveQuery(searchInput);
    debouncedSearch.cancel(); // Stop any pending debounce if user clicks Search button
  }, [searchInput, debouncedSearch]);

  return {
    jobs,
    total: data?.pages[0]?.total ?? 0,
    loading: status === 'pending',
    loadingMore: isFetchingNextPage,
    refreshing: isFetching && !isFetchingNextPage,
    searchInput,
    setSearchInput,
    activeQuery,
    error: error ? (error as Error).message : null,
    fetchJobs: refetch,
    loadMore,
    onRefresh,
    handleSearch,
    summary: summaryData?.summary || {},
  };
};
