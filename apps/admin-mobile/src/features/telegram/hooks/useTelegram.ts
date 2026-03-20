import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { telegramsApi, type TelegramBroadcast, type TelegramBroadcastSummary } from '@fresherflow/api-client';
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

export const useTelegram = () => {
    const [broadcasts, setBroadcasts] = useState<TelegramBroadcast[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedWindow, setSelectedWindow] = useState<TelegramWindow>('7d');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<TelegramBroadcastSummary>({ sent: 0, failed: 0, skipped: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchBroadcasts = useCallback(async (opts: { pg?: number; status?: StatusFilter; window?: TelegramWindow; force?: boolean } = {}) => {
        const { pg = 1, status = statusFilter, window = selectedWindow } = opts;
        try {
            if (pg === 1) setLoading(true);
            else setLoadingMore(true);

            const params: { limit: number; page: number; window: string; status?: string } = { limit: PAGE_SIZE, page: pg, window };
            if (status !== 'ALL') params.status = status;

            const data = await telegramsApi.broadcasts(params);
            const rows = data.broadcasts ?? [];

            if (pg === 1) setBroadcasts(rows);
            else setBroadcasts((prev) => [...prev, ...rows]);

            setTotal(data.total ?? rows.length);
            setSummary(data.summary ?? { sent: 0, failed: 0, skipped: 0 });
            setPage(pg);
            setSelectedWindow(window);
        } catch {
            // Keep previous state
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [selectedWindow, statusFilter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchBroadcasts({ pg: 1, force: true });
    }, [fetchBroadcasts]);

    const onLoadMore = useCallback(() => {
        if (!loadingMore && broadcasts.length < total) {
            void fetchBroadcasts({ pg: page + 1 });
        }
    }, [broadcasts.length, fetchBroadcasts, loadingMore, page, total]);

    const onFilter = useCallback((status: StatusFilter) => {
        setStatusFilter(status);
        void fetchBroadcasts({ pg: 1, status, force: true });
    }, [fetchBroadcasts]);

    const onWindowChange = useCallback((window: TelegramWindow) => {
        void fetchBroadcasts({ pg: 1, window, force: true });
    }, [fetchBroadcasts]);

    const retryBroadcast = useCallback((id: string) => {
        Alert.alert('Retry Broadcast?', 'Re-send the failed Telegram broadcast.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry',
                onPress: async () => {
                    setRetryingId(id);
                    try {
                        await telegramsApi.retry(id);
                        toast.success('Retried', 'Broadcast retry queued.');
                        void fetchBroadcasts({ pg: 1, force: true });
                    } catch (error: unknown) {
                        const message = (error as { message?: string })?.message || 'Failed';
                        toast.error('Retry failed', message);
                    } finally {
                        setRetryingId(null);
                    }
                },
            },
        ]);
    }, [fetchBroadcasts]);

    return {
        broadcasts,
        statusFilter,
        selectedWindow,
        total,
        loading,
        loadingMore,
        refreshing,
        retryingId,
        stats: {
            sent: summary.sent,
            failed: summary.failed,
            skipped: summary.skipped,
        },
        fetchBroadcasts,
        onRefresh,
        onLoadMore,
        onFilter,
        onWindowChange,
        retryBroadcast,
    };
};
