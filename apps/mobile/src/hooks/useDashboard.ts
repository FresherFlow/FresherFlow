import { useState, useCallback, useEffect } from 'react';
import { dashboardApi, savedApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';

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
    const [loading, setLoading] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [highlightsData, savedData] = await Promise.all([
                dashboardApi.getHighlights(),
                savedApi.list()
            ]);
            
            setHighlights(highlightsData as Highlights);
            setRecentActivity((savedData as { opportunities?: Opportunity[] }).opportunities || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchDashboardData();
    }, [fetchDashboardData]);

    return {
        highlights,
        recentActivity,
        loading,
        refresh: fetchDashboardData
    };
}
