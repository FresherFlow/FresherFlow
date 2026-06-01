import { useCallback, useState, useEffect, useMemo } from 'react';
import { contributorsApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { readContributionsCache, saveContributionsCache } from '@/utils/cache/offlineCache';

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
    username?: string;
    usernameUpdatedAt?: string;
    stats: ContributorStats;
}

export function useContributor(userId: string) {
    const [cachedData, setCachedData] = useState<{ user: Contributor; opportunities: Opportunity[] } | null>(null);
    const [isHydrating, setIsHydrating] = useState(true);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // Instant Hydration
    useEffect(() => {
        const hydrate = async () => {
            try {
                const cached = await readContributionsCache();
                if (cached && cached.items.length > 0) {
                    setCachedData({
                        user: cached.user as Contributor,
                        opportunities: cached.items as Opportunity[]
                    });
                }
            } finally {
                setIsHydrating(false);
            }
        };
        void hydrate();
    }, [userId]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['contributor', userId],
        queryFn: async ({ pageParam = 1 }) => {
            const res = await contributorsApi.list(userId, pageParam as number);
            
            if (pageParam === 1) {
                void saveContributionsCache(res.opportunities, res.user);
            }
            
            return res;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: 1000 * 60 * 5,
    });

    const user = data?.pages[0]?.user || cachedData?.user;
    const opportunities = useMemo(() => {
        const remote = data?.pages.flatMap(p => p.opportunities) || [];
        return remote.length > 0 ? remote : (cachedData?.opportunities || []);
    }, [data, cachedData]);

    const onRefresh = useCallback(async () => {
        setIsManualRefreshing(true);
        await refetch();
        setIsManualRefreshing(false);
    }, [refetch]);

    return {
        user,
        opportunities,
        loading: (isLoading || isHydrating) && !user,
        refreshing: isManualRefreshing,
        loadingMore: isFetchingNextPage,
        error: error ? (error as Error).message : null,
        loadMore: () => {
            if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
            }
        },
        refresh: onRefresh,
    };
}
