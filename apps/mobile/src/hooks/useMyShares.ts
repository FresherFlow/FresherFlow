import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { saveSharesCache, readSharesCache } from '@/utils/offlineCache';
import { getShareQueue, QueuedShare, syncShareQueue } from '@/utils/shareQueue';
import { getBoolean, setBoolean } from '@/utils/storage';

export interface Share {
    id: string;
    createdAt: string;
    sourceLink?: string;
    mappedOpportunity?: {
        id: string;
        title: string;
        company: string;
        status: string;
        publishedAt: string;
        expiredAt: string;
        deletionReason?: string | null;
        clicksCount: number;
        savesCount: number;
    } | null;
}

const mapQueuedShareToShare = (q: QueuedShare): Share => {
    if (q.type === 'LINK') {
        return {
            id: q.tempId,
            createdAt: new Date(q.timestamp).toISOString(),
            sourceLink: q.url,
            mappedOpportunity: {
                id: q.tempId,
                title: q.url || 'Shared Link',
                company: '',
                status: 'OFFLINE',
                publishedAt: '',
                expiredAt: '',
                clicksCount: 0,
                savesCount: 0,
            }
        };
    } else {
        return {
            id: q.tempId,
            createdAt: new Date(q.timestamp).toISOString(),
            sourceLink: q.referral?.companyUrl,
            mappedOpportunity: {
                id: q.tempId,
                title: q.referral?.title || 'Referral Request',
                company: q.referral?.company || '',
                status: 'OFFLINE',
                publishedAt: '',
                expiredAt: '',
                clicksCount: 0,
                savesCount: 0,
            }
        };
    }
};

let lastFetchedTime = 0;
const THROTTLE_MS = 30000; // 30 seconds throttle

export function useMyShares() {
    const { user } = useAuthStore();
    const [shares, setShares] = useState<Share[]>([]);
    const [stats, setStats] = useState({ totalShared: 0, totalPublished: 0, approvalRate: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const isAnonymous = !user || user.isAnonymous;

    const fetchShares = useCallback(async (pageNum = 1) => {
        if (isAnonymous) return;
        try {
            const res = await profileApi.getShares(pageNum);
            const newShares = res.shares as Share[];

            if (pageNum === 1) {
                const queue = await getShareQueue();
                const offlineShares = queue.map(mapQueuedShareToShare);
                const mergedShares = [...offlineShares, ...newShares];
                
                setShares(mergedShares);
                void saveSharesCache(newShares, res.stats);
                setStats({
                    ...res.stats,
                    totalShared: res.stats.totalShared + queue.length,
                });
            } else {
                setShares(prev => [...prev, ...newShares]);
                setStats(res.stats);
            }

            setHasMore(res.hasMore);
            setPage(pageNum);
        } catch (err: unknown) {
            if ((err as { status?: number }).status !== 401) {
                console.error('Failed to fetch shares:', err);
            }
        }
    }, [user, isAnonymous]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            void fetchShares(page + 1);
        }
    }, [loading, hasMore, page, fetchShares]);

    useEffect(() => {
        const loadCacheAndFetch = async () => {
            const cached = await readSharesCache();
            const queue = await getShareQueue();
            const offlineShares = queue.map(mapQueuedShareToShare);

            if (cached && cached.items.length > 0) {
                const mergedShares = [...offlineShares, ...(cached.items as Share[])];
                setShares(mergedShares);
                const cachedStats = cached.stats as typeof stats;
                setStats({
                    ...cachedStats,
                    totalShared: cachedStats.totalShared + queue.length,
                });
                setLoading(false);
            } else {
                if (offlineShares.length > 0) {
                    setShares(offlineShares);
                    setStats({
                        totalShared: offlineShares.length,
                        totalPublished: 0,
                        approvalRate: 0,
                    });
                    setLoading(false);
                } else {
                    setLoading(true);
                }
            }

            try {
                if (isAnonymous) {
                    setLoading(false);
                    return;
                }
                
                // Skip server fetch if we fetched very recently (throttling), unless data is dirty
                const now = Date.now();
                const isDirty = getBoolean('fresherflow_shares_dirty', false);
                if (now - lastFetchedTime < THROTTLE_MS && cached && cached.items.length > 0 && !isDirty) {
                    setLoading(false);
                    return;
                }

                await syncShareQueue();
                const res = await profileApi.getShares(1);
                lastFetchedTime = Date.now();
                setBoolean('fresherflow_shares_dirty', false);
                const newShares = res.shares as Share[];
                const queueAfterSync = await getShareQueue();
                const offlineSharesAfterSync = queueAfterSync.map(mapQueuedShareToShare);
                const mergedShares = [...offlineSharesAfterSync, ...newShares];
                
                setShares(mergedShares);
                void saveSharesCache(newShares, res.stats);
                setStats({
                    ...res.stats,
                    totalShared: res.stats.totalShared + queueAfterSync.length,
                });
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
    }, [user, isAnonymous]);

    return {
        shares,
        stats,
        loading,
        refreshing,
        loadMore,
        refresh: async () => {
            setRefreshing(true);
            await syncShareQueue();
            await fetchShares(1);
            lastFetchedTime = Date.now(); // Reset throttle on manual pull-to-refresh
            setRefreshing(false);
        },
    };
}
