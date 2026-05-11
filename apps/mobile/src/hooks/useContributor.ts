import { useState, useCallback, useEffect } from 'react';
import { contributorsApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';

export interface ContributorStats {
    totalContributed: number;
    totalPublished: number;
    approvalRate: number;
}

export interface Contributor {
    id: string;
    fullName: string;
    trustLevel: string;
    createdAt: string;
    stats: ContributorStats;
}

export function useContributor(userId: string) {
    const [data, setData] = useState<{ user: Contributor; opportunities: Opportunity[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchContributor = useCallback(async (pageNum = 1) => {
        try {
            if (pageNum === 1) setLoading(true);
            const res = await contributorsApi.list(userId, pageNum);
            
            if (pageNum === 1) {
                setData(res);
            } else {
                setData(prev => prev ? {
                    ...res,
                    opportunities: [...prev.opportunities, ...res.opportunities]
                } : res);
            }
            
            setHasMore(res.hasMore);
            setPage(pageNum);
        } catch (err: unknown) {
            console.error('Failed to fetch contributor:', err);
            setError((err as Error).message || 'Failed to load contributor profile');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            void fetchContributor(page + 1);
        }
    }, [loading, hasMore, page, fetchContributor]);

    useEffect(() => {
        void fetchContributor();
    }, [fetchContributor]);

    return {
        ...data,
        loading,
        error,
        loadMore,
        refresh: () => fetchContributor(1),
    };
}
