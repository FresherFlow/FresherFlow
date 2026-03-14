import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Telegram, type TelegramBroadcast } from '../lib/api';
import { toast } from '../lib/toast';
import { type StatusFilter } from '../components/telegram/BroadcastFilters';

const PAGE_SIZE = 30;

export const useTelegramScreen = () => {
    const [broadcasts, setBroadcasts] = useState<TelegramBroadcast[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchBroadcasts = useCallback(async (opts: { pg?: number; status?: StatusFilter; force?: boolean } = {}) => {
        const { pg = 1, status = statusFilter, force: _force = false } = opts;
        try {
            if (pg === 1) setLoading(true); else setLoadingMore(true);
            const params: Record<string, string | number> = { limit: PAGE_SIZE, page: pg };
            if (status !== 'ALL') params.status = status;
            const data = await Telegram.broadcasts(params as any) as any;
            const rows: TelegramBroadcast[] = data.broadcasts ?? [];
            if (pg === 1) setBroadcasts(rows); else setBroadcasts(prev => [...prev, ...rows]);
            setTotal(data.total ?? rows.length);
            setPage(pg);
        } catch { /* silent */ } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    const onRefresh = () => { setRefreshing(true); void fetchBroadcasts({ pg: 1, force: true }); };
    const onLoadMore = () => { if (!loadingMore && broadcasts.length < total) void fetchBroadcasts({ pg: page + 1 }); };
    const onFilter = (s: StatusFilter) => { setStatusFilter(s); void fetchBroadcasts({ pg: 1, status: s, force: true }); };

    const retryBroadcast = (id: string) => {
        Alert.alert('Retry Broadcast?', 'Re-send the failed Telegram broadcast.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry', onPress: async () => {
                    setRetryingId(id);
                    try {
                        await Telegram.retry(id);
                        toast.success('Retried', 'Broadcast retry queued.');
                        void fetchBroadcasts({ pg: 1, force: true });
                    } catch (e) {
                        toast.error('Retry failed', e instanceof Error ? e.message : 'Failed');
                    } finally { setRetryingId(null); }
                }
            }
        ]);
    };

    const stats = {
        sent: broadcasts.filter(b => b.status === 'SENT').length,
        failed: broadcasts.filter(b => b.status === 'FAILED').length,
        pending: broadcasts.filter(b => b.status === 'PENDING' || b.status === 'RETRY').length,
    };

    return {
        broadcasts,
        statusFilter,
        total,
        loading,
        loadingMore,
        refreshing,
        retryingId,
        stats,
        fetchBroadcasts,
        onRefresh,
        onLoadMore,
        onFilter,
        retryBroadcast
    };
};
