import { useState, useCallback, useEffect } from 'react';
import { dashboardApi, savedApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';

export function useDashboard() {
    const [highlights, setHighlights] = useState<unknown>(null);
    const [recentActivity, setRecentActivity] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [highlightsData, savedData] = await Promise.all([
                dashboardApi.getHighlights(),
                savedApi.list()
            ]);
            
            setHighlights(highlightsData);
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
