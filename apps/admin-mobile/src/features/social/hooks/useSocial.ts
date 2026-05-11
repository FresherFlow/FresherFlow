import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { socialPostsApi, type SocialPost, type SocialPostSummary } from '@fresherflow/api-client';
import { toast } from '../../../lib/toast';
import { type SocialStatusFilter } from '../components/SocialPostFilters';

export const useSocial = () => {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [statusFilter, setStatusFilter] = useState<SocialStatusFilter>('ALL');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<SocialPostSummary>({
        pending: 0,
        published: 0,
        failed: 0,
        disabled: 0,
        dryRun: 0,
    });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchPosts = useCallback(async (opts: { pg?: number; status?: SocialStatusFilter; force?: boolean } = {}) => {
        const { pg = 1, status = statusFilter } = opts;
        try {
            if (pg === 1) setLoading(true); else setLoadingMore(true);
            const params: Record<string, unknown> = {
                page: pg,
            };
            if (status !== 'ALL') params.status = status;
            
            const data = await socialPostsApi.list(params);
            const rows = data.posts ?? [];
            setTotal(data.total ?? rows.length);
            setSummary(data.summary ?? {
                pending: 0,
                published: 0,
                failed: 0,
                disabled: 0,
                dryRun: 0,
            });
            
            if (pg === 1) setPosts(rows); else setPosts((prev) => [...prev, ...rows]);
            setPage(pg);
        } catch (e: unknown) {
            toast.error('Social posts failed', e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    const onRefresh = useCallback(() => { 
        setRefreshing(true); 
        void fetchPosts({ pg: 1, force: true }); 
    }, [fetchPosts]);

    const onLoadMore = useCallback(() => { 
        if (!loadingMore && posts.length < total) {
            void fetchPosts({ pg: page + 1 }); 
        }
    }, [fetchPosts, loadingMore, posts.length, total, page]);

    const onFilter = useCallback((s: SocialStatusFilter) => { 
        setStatusFilter(s); 
        void fetchPosts({ pg: 1, status: s, force: true }); 
    }, [fetchPosts]);

    const retryPost = useCallback((id: string) => {
        Alert.alert('Retry social post?', 'Retry the failed social post on this platform.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry', onPress: async () => {
                    setRetryingId(id);
                    try {
                        await socialPostsApi.retry(id);
                        toast.success('Retried', 'Social post retry queued.');
                        void fetchPosts({ pg: 1, force: true });
                    } catch (e: unknown) {
                        toast.error('Retry failed', e instanceof Error ? e.message : 'Failed');
                    } finally {
                        setRetryingId(null);
                    }
                }
            }
        ]);
    }, [fetchPosts]);

    const stats = {
        published: summary.published,
        failed: summary.failed,
        pending: summary.pending,
    };

    return {
        posts,
        statusFilter,
        total,
        loading,
        loadingMore,
        refreshing,
        retryingId,
        stats,
        fetchPosts,
        onRefresh,
        onLoadMore,
        onFilter,
        retryPost,
    };
};
