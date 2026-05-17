import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { saveSharesCache, readSharesCache } from '@/utils/offlineCache';

export interface Share {
    id: string;
    createdAt: string;
    mappedOpportunity?: {
        id: string;
        title: string;
        company: string;
        status: string;
        publishedAt: string;
        expiredAt: string;
        clicksCount: number;
        savesCount: number;
    } | null;
}

export function useMyShares() {
    const { user } = useAuthStore();
    const [shares, setShares] = useState<Share[]>([]);
    const [stats, setStats] = useState({ totalShared: 0, totalPublished: 0, approvalRate: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchShares = useCallback(async (pageNum = 1) => {
        if (!user) return;
        try {
            const res = await profileApi.getShares(pageNum);
            const newShares = res.shares as Share[];

            if (pageNum === 1) {
                setShares(newShares);
                void saveSharesCache(newShares, res.stats);
            } else {
                setShares(prev => [...prev, ...newShares]);
            }

            setStats(res.stats);
            setHasMore(res.hasMore);
            setPage(pageNum);
        } catch (err: unknown) {
            if ((err as { status?: number }).status !== 401) {
                console.error('Failed to fetch shares:', err);
            }
        }
    }, [user]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            void fetchShares(page + 1);
        }
    }, [loading, hasMore, page, fetchShares]);

    useEffect(() => {
        const loadCacheAndFetch = async () => {
            const cached = await readSharesCache();
            let hasCached = false;
            if (cached && cached.items.length > 0) {
                setShares(cached.items as Share[]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setStats(cached.stats as any);
                setLoading(false);
                hasCached = true;
            } else {
                setLoading(true);
            }

            try {
                if (!user) {
                    setLoading(false);
                    return;
                }
                const res = await profileApi.getShares(1);
                const newShares = res.shares as Share[];
                setShares(newShares);
                void saveSharesCache(newShares, res.stats);
                setStats(res.stats);
                setHasMore(res.hasMore);
                setPage(1);
            } catch (err: unknown) {
                if ((err as { status?: number }).status !== 401) {
                    console.error('Failed to fetch shares:', err);
                }
            } finally {
                setLoading(false);
            }
        };
        void loadCacheAndFetch();
    }, [user]);

    return {
        shares,
        stats,
        loading,
        refreshing,
        loadMore,
        refresh: async () => {
            setRefreshing(true);
            await fetchShares(1);
            setRefreshing(false);
        },
    };
}
