import { useCallback, useMemo, useState } from 'react';
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

export function useAnalytics() {
    const [selectedDays, setSelectedDays] = useState<number>(30);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [activity, setActivity] = useState<RecentActivityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async (days: number) => {
        try {
            const [overview, recent] = await Promise.all([
                adminAnalyticsApi.overview(days) as Promise<AnalyticsData>,
                adminAnalyticsApi.recentActivity(8) as Promise<RecentActivityData>,
            ]);
            setData(overview);
            setActivity(recent);
            setSelectedDays(days);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const totalChannel = useMemo(() => {
        if (!data?.channelAttribution) return 0;
        const c = data.channelAttribution;
        return (c.telegram ?? 0) + (c.whatsapp ?? 0) + (c.linkedin ?? 0) + (c.others ?? 0);
    }, [data]);

    const getPct = useCallback(
        (count: number) => (totalChannel > 0 ? Math.round((count / totalChannel) * 100) : 0),
        [totalChannel]
    );

    return {
        data,
        activity,
        loading,
        refreshing,
        selectedDays,
        setRefreshing,
        setSelectedDays,
        fetchAll,
        totalChannel,
        getPct,
    };
}
