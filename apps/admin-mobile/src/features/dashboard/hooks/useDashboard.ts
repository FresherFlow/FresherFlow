import { useCallback, useState } from 'react';
import { adminSystemApi, adminAnalyticsApi, type MetricsV2, type RecentActivity } from '@fresherflow/api-client';

export const DASHBOARD_WINDOW_OPTIONS = [
    { label: '1D', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '14D', value: '14d' },
    { label: '30D', value: '30d' },
] as const;

export type DashboardWindow = typeof DASHBOARD_WINDOW_OPTIONS[number]['value'];

export const useDashboard = () => {
    const [metrics, setMetrics] = useState<MetricsV2 | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity['items']>([]);
    const [selectedWindow, setSelectedWindow] = useState<DashboardWindow>('7d');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async (window: DashboardWindow) => {
        setError(null);
        try {
            const [metricsResult, activityResult] = await Promise.allSettled([
                adminSystemApi.metricsV2(window),
                adminAnalyticsApi.recentActivity(8),
            ]);

            if (metricsResult.status === 'fulfilled') {
                setMetrics(metricsResult.value);
            } else {
                const message = (metricsResult.reason as { message?: string })?.message || String(metricsResult.reason);
                setError(message);
            }

            if (activityResult.status === 'fulfilled') {
                setRecentActivity(activityResult.value.items?.slice(0, 8) ?? []);
            }

            setSelectedWindow(window);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    return {
        metrics,
        recentActivity,
        selectedWindow,
        loading,
        refreshing,
        error,
        setRefreshing,
        fetchDashboard,
    };
};
