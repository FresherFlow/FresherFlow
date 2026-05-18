import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { socialPostsApi } from '@fresherflow/api-client';
import { toast } from '../../../lib/toast';
import { type SocialStatusFilter } from '../components/SocialPostFilters';

const PAGE_SIZE = 30;

/**
 * Hook for managing social media post distribution.
 * Uses useInfiniteQuery for standardized caching and pagination.
 */
export const useSocial = () => {
    const [statusFilter, setStatusFilter] = useState<SocialStatusFilter>('ALL');
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['admin', 'social', 'posts', statusFilter],
        queryFn: ({ pageParam = 1 }) => {
            const params: Record<string, unknown> = {
                page: pageParam,
                limit: PAGE_SIZE,
            };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            return socialPostsApi.list(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const totalLoaded = allPages.reduce((acc, p) => acc + (p.posts?.length || 0), 0);
            if (totalLoaded < (lastPage.total || 0)) {
                return allPages.length + 1;
            }
            return undefined;
        },
        staleTime: 1000 * 60 * 5,
    });

    const posts = useMemo(() => 
        data?.pages.flatMap(p => p.posts || []) ?? [], 
        [data]
    );

    const summary = useMemo(() => 
        data?.pages[0]?.summary ?? { pending: 0, published: 0, failed: 0, disabled: 0, dryRun: 0 }, 
        [data]
    );

    const total = data?.pages[0]?.total ?? 0;

    const onRefresh = useCallback(() => { 
        void refetch(); 
    }, [refetch]);

    const onLoadMore = useCallback(() => { 
        if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage(); 
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const onFilter = useCallback((s: SocialStatusFilter) => { 
        setStatusFilter(s); 
    }, []);

    const retryMutation = useMutation({
        mutationFn: (id: string) => socialPostsApi.retry(id),
        onSuccess: () => {
            toast.success('Retried', 'Social post retry queued.');
            void refetch();
        },
        onError: (e: unknown) => {
            toast.error('Retry failed', e instanceof Error ? e.message : 'Failed');
        }
    });

    const retryPost = useCallback((id: string) => {
        Alert.alert('Retry social post?', 'Retry the failed social post on this platform.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry', onPress: () => {
                    setRetryingId(id);
                    retryMutation.mutate(id, {
                        onSettled: () => setRetryingId(null)
                    });
                }
            }
        ]);
    }, [retryMutation]);

    return {
        posts,
        statusFilter,
        total,
        loading: status === 'pending',
        loadingMore: isFetchingNextPage,
        refreshing: isFetching && !isFetchingNextPage,
        retryingId,
        stats: {
            published: summary.published,
            failed: summary.failed,
            pending: summary.pending,
        },
        fetchPosts: refetch,
        onRefresh,
        onLoadMore,
        onFilter,
        retryPost,
    };
};
