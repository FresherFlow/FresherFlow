import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { telegramsApi } from '@fresherflow/api-client';
import { toast } from '../../../lib/toast';
import { type StatusFilter } from '../components/BroadcastFilters';

const PAGE_SIZE = 30;

export const TELEGRAM_WINDOW_OPTIONS = [
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'All', value: 'all' },
] as const;

export type TelegramWindow = typeof TELEGRAM_WINDOW_OPTIONS[number]['value'];

/**
 * Hook for managing Telegram broadcast distribution.
 * Uses useInfiniteQuery for standardized caching and pagination.
 */
export const useTelegram = () => {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedWindow, setSelectedWindow] = useState<TelegramWindow>('7d');
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
        queryKey: ['admin', 'telegrams', 'broadcasts', statusFilter, selectedWindow],
        queryFn: ({ pageParam = 1 }) => {
            const params: { limit: number; page: number; window: TelegramWindow; status?: string } = { 
                limit: PAGE_SIZE, 
                page: pageParam, 
                window: selectedWindow 
            };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            return telegramsApi.broadcasts(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const totalLoaded = allPages.reduce((acc, p) => acc + (p.broadcasts?.length || 0), 0);
            if (totalLoaded < (lastPage.total || 0)) {
                return allPages.length + 1;
            }
            return undefined;
        },
        staleTime: 1000 * 60 * 5,
    });

    const broadcasts = useMemo(() => 
        data?.pages.flatMap(p => p.broadcasts || []) ?? [], 
        [data]
    );

    const summary = useMemo(() => 
        data?.pages[0]?.summary ?? { sent: 0, failed: 0, skipped: 0 }, 
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

    const onFilter = useCallback((status: StatusFilter) => {
        setStatusFilter(status);
    }, []);

    const onWindowChange = useCallback((window: TelegramWindow) => {
        setSelectedWindow(window);
    }, []);

    const retryMutation = useMutation({
        mutationFn: (id: string) => telegramsApi.retry(id),
        onSuccess: () => {
            toast.success('Retried', 'Broadcast retry queued.');
            void refetch();
        },
        onError: (error: unknown) => {
            const message = (error as { message?: string })?.message || 'Failed';
            toast.error('Retry failed', message);
        }
    });

    const retryBroadcast = useCallback((id: string) => {
        Alert.alert('Retry Broadcast?', 'Re-send the failed Telegram broadcast.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry',
                onPress: () => {
                    setRetryingId(id);
                    retryMutation.mutate(id, {
                        onSettled: () => setRetryingId(null)
                    });
                },
            },
        ]);
    }, [retryMutation]);

    return {
        broadcasts,
        statusFilter,
        selectedWindow,
        total,
        loading: status === 'pending',
        loadingMore: isFetchingNextPage,
        refreshing: isFetching && !isFetchingNextPage,
        retryingId,
        stats: {
            sent: summary.sent,
            failed: summary.failed,
            skipped: summary.skipped,
        },
        fetchBroadcasts: refetch,
        onRefresh,
        onLoadMore,
        onFilter,
        onWindowChange,
        retryBroadcast,
    };
};
