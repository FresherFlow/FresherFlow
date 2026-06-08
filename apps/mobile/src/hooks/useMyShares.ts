import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { saveSharesCache, readSharesCache } from '@/utils/cache/offlineCache';
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

export interface SharedResource {
    id: string;
    title: string;
    url: string;
    status: string;
    company?: string | null;
    sector: string;
    createdAt: string;
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

const mapQueuedShareToResource = (q: QueuedShare): SharedResource => {
    return {
        id: q.tempId,
        title: q.title || 'User Submission',
        url: q.url || '',
        status: 'OFFLINE',
        company: q.referral?.company || '',
        sector: 'PRIVATE',
        createdAt: new Date(q.timestamp).toISOString()
    };
};

let lastFetchedTime = 0;
const THROTTLE_MS = 30000; // 30 seconds throttle

export function useMyShares() {
    const { user } = useAuthStore();
    const [shares, setShares] = useState<Share[]>([]);
    const [resources, setResources] = useState<SharedResource[]>([]);
    const [stats, setStats] = useState({ totalShared: 0, totalPublished: 0, approvalRate: 0, totalResources: 0 });
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
            const newResources = res.resources as SharedResource[];

            if (pageNum === 1) {
                const queue = await getShareQueue();
                const offlineShares = queue.filter(q => q.type !== 'RESOURCE').map(mapQueuedShareToShare);
                const offlineResources = queue.filter(q => q.type === 'RESOURCE').map(mapQueuedShareToResource);

                const mergedShares = [...offlineShares, ...newShares];
                const mergedResources = [...offlineResources, ...newResources];
                
                setShares(mergedShares);
                setResources(mergedResources);
                void saveSharesCache(newShares, newResources, res.stats);
                setStats({
                    ...res.stats,
                    totalShared: res.stats.totalShared + offlineShares.length,
                    totalResources: res.totalResources + offlineResources.length,
                });
            } else {
                setShares(prev => [...prev, ...newShares]);
                setResources(prev => [...prev, ...newResources]);
                setStats({ ...res.stats, totalResources: res.totalResources });
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
            const offlineShares = queue.filter(q => q.type !== 'RESOURCE').map(mapQueuedShareToShare);
            const offlineResources = queue.filter(q => q.type === 'RESOURCE').map(mapQueuedShareToResource);

            if (cached && (cached.items.length > 0 || (cached.resources && cached.resources.length > 0))) {
                const mergedShares = [...offlineShares, ...(cached.items as Share[])];
                const mergedResources = [...offlineResources, ...((cached.resources || []) as SharedResource[])];
                setShares(mergedShares);
                setResources(mergedResources);
                const cachedStats = cached.stats as typeof stats;
                setStats({
                    ...cachedStats,
                    totalShared: (cachedStats.totalShared || 0) + offlineShares.length,
                    totalResources: (cachedStats.totalResources || 0) + offlineResources.length,
                });
                setLoading(false);
            } else {
                if (offlineShares.length > 0 || offlineResources.length > 0) {
                    setShares(offlineShares);
                    setResources(offlineResources);
                    setStats({
                        totalShared: offlineShares.length,
                        totalPublished: 0,
                        approvalRate: 0,
                        totalResources: offlineResources.length,
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
                const newResources = res.resources as SharedResource[];
                
                const queueAfterSync = await getShareQueue();
                const offlineSharesAfterSync = queueAfterSync.filter(q => q.type !== 'RESOURCE').map(mapQueuedShareToShare);
                const offlineResourcesAfterSync = queueAfterSync.filter(q => q.type === 'RESOURCE').map(mapQueuedShareToResource);
                
                const mergedShares = [...offlineSharesAfterSync, ...newShares];
                const mergedResources = [...offlineResourcesAfterSync, ...newResources];
                
                setShares(mergedShares);
                setResources(mergedResources);
                void saveSharesCache(newShares, newResources, res.stats);
                setStats({
                    ...res.stats,
                    totalShared: res.stats.totalShared + offlineSharesAfterSync.length,
                    totalResources: res.totalResources + offlineResourcesAfterSync.length,
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
        resources,
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
