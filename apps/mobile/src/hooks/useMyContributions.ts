import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '@fresherflow/api-client';

export interface Contribution {
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

export function useMyContributions() {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [stats, setStats] = useState({ totalContributed: 0, totalPublished: 0, approvalRate: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchContributions = useCallback(async (pageNum = 1) => {
        try {
            if (pageNum === 1) setLoading(true);
            const res = await profileApi.getContributions(pageNum);
            const newContribs = res.contributions as Contribution[];
            
            if (pageNum === 1) {
                setContributions(newContribs);
            } else {
                setContributions(prev => [...prev, ...newContribs]);
            }
            
            setStats(res.stats);
            setHasMore(res.hasMore);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to fetch contributions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            void fetchContributions(page + 1);
        }
    }, [loading, hasMore, page, fetchContributions]);

    useEffect(() => {
        void fetchContributions();
    }, [fetchContributions]);

    return {
        contributions,
        stats,
        loading,
        loadMore,
        refresh: () => fetchContributions(1),
    };
}
