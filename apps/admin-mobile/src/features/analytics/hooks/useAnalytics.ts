import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsApi } from '@fresherflow/api-client';

export type AnalyticsData = {
    windowDays: number;
    linkHealth?: { healthy: number; broken: number; retrying: number };
    opportunityStatus?: { published: number; draft: number; archived: number };
    activity?: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        signupViews30d: number;
        signupSuccess30d: number;
        signupConversionRate30d: number;
    };
    typeDistribution?: { type: string; count: number }[];
    feedback?: Record<string, number>;
    clicks?: {
        applyClicks30d: number;
        uniqueUserClickers30d: number;
        uniqueAnonSessions30d: number;
        topClickedOpportunities: { opportunityId: string; clicks: number; title: string; company: string }[];
    };
    channelAttribution?: { telegram: number; whatsapp: number; linkedin: number; others: number };
    urgent?: { closingSoon48h: number; brokenLinks: number };
};

export type RecentActivityData = {
    actions?: { id: string; actionType: string; createdAt: string; user: { fullName: string; email: string } | null; opportunity: { title: string; company: string } | null }[];
    users?: { id: string; fullName: string; email: string; createdAt: string; profile: { completionPercentage: number } | null }[];
};

export const ANALYTICS_DAY_OPTIONS = [1, 7, 14, 30] as const;

/**
 * Hook for fetching platform analytics.
 * Uses useQuery for standardized caching and local-first data availability.
 */
export function useAnalytics() {
    const [selectedDays, setSelectedDays] = useState<number>(30);

    const { 
        data: overview, 
        isLoading: overviewLoading, 
        isRefetching: overviewRefetching,
        refetch: refetchOverview 
    } = useQuery({
        queryKey: ['admin', 'analytics', 'overview', selectedDays],
        queryFn: () => adminAnalyticsApi.overview(selectedDays) as Promise<AnalyticsData>,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const { 
        data: activity, 
        isLoading: activityLoading,
        isRefetching: activityRefetching,
        refetch: refetchActivity
    } = useQuery({
        queryKey: ['admin', 'recent-activity'],
        queryFn: () => adminAnalyticsApi.recentActivity(8) as Promise<RecentActivityData>,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    const fetchAll = useCallback(async (days: number) => {
        setSelectedDays(days);
        await Promise.all([refetchOverview(), refetchActivity()]);
    }, [refetchOverview, refetchActivity]);

    const totalChannel = useMemo(() => {
        if (!overview?.channelAttribution) return 0;
        const c = overview.channelAttribution;
        return (c.telegram ?? 0) + (c.whatsapp ?? 0) + (c.linkedin ?? 0) + (c.others ?? 0);
    }, [overview]);

    const getPct = useCallback(
        (count: number) => (totalChannel > 0 ? Math.round((count / totalChannel) * 100) : 0),
        [totalChannel]
    );

    return {
        data: overview || null,
        activity: activity || null,
        loading: overviewLoading || activityLoading,
        refreshing: overviewRefetching || activityRefetching,
        selectedDays,
        setSelectedDays,
        fetchAll,
        totalChannel,
        getPct,
    };
}
