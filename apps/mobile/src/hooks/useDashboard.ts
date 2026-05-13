import { useState, useCallback, useEffect } from 'react';
import { dashboardApi, savedApi, opportunitiesApi, actionsApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { readFeedCache } from '@/utils/offlineCache';

interface Highlights {
    urgent?: {
        walkins?: Opportunity[];
        deadlines?: Opportunity[];
    };
    new?: Opportunity[];
    hot?: Opportunity[];
    [key: string]: unknown;
}

export function useDashboard() {
    const [highlights, setHighlights] = useState<Highlights | null>(null);
    const [recentActivity, setRecentActivity] = useState<Opportunity[]>([]);
    const [latestJobs, setLatestJobs] = useState<Opportunity[]>([]);
    const [appliedJobs, setAppliedJobs] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [highlightsData, savedData, latestData, actionsData] = await Promise.all([
                dashboardApi.getHighlights(),
                savedApi.list(),
                opportunitiesApi.list({ sort: 'freshness_v2' }),
                actionsApi.list()
            ]);

            setHighlights(highlightsData as Highlights);
            setRecentActivity((savedData as { opportunities?: Opportunity[] }).opportunities || []);
            setLatestJobs((latestData as { opportunities?: Opportunity[] }).opportunities || []);

            const actions = (actionsData as { actions?: { opportunity?: Opportunity }[] }).actions || [];
            setAppliedJobs(actions.map(a => a.opportunity).filter((o): o is Opportunity => !!o));
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadCache = async () => {
            const cached = await readFeedCache();
            if (cached && cached.items.length > 0) {
                setLatestJobs(cached.items.slice(0, 10));
            }
        };
        void loadCache();
        void fetchDashboardData();
    }, [fetchDashboardData]);

    return {
        highlights,
        recentActivity,
        latestJobs,
        appliedJobs,
        loading,
        refresh: fetchDashboardData
    };
}
