import { useState, useCallback } from 'react';
import { Analytics } from '../lib/api';

export type AnalyticsData = {
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

export const useAnalyticsScreen = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [activity, setActivity] = useState<RecentActivityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [overview, recent] = await Promise.all([
                Analytics.overview() as Promise<AnalyticsData>,
                Analytics.recentActivity() as unknown as Promise<RecentActivityData>,
            ]);
            setData(overview);
            setActivity(recent);
        } catch {
            // fail silently — show stale
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const totalChannel = data?.channelAttribution 
        ? (data.channelAttribution.telegram ?? 0) + 
          (data.channelAttribution.whatsapp ?? 0) + 
          (data.channelAttribution.linkedin ?? 0) + 
          (data.channelAttribution.others ?? 0)
        : 0;

    const getPct = (n: number) => totalChannel > 0 ? Math.round((n / totalChannel) * 100) : 0;

    return {
        data,
        activity,
        loading,
        refreshing,
        setRefreshing,
        fetchAll,
        totalChannel,
        getPct
    };
};
