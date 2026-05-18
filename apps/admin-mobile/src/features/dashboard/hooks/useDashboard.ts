import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminSystemApi, adminAnalyticsApi } from '@fresherflow/api-client';

export const DASHBOARD_WINDOW_OPTIONS = [
    { label: '1D', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '14D', value: '14d' },
    { label: '30D', value: '30d' },
] as const;

export type DashboardWindow = typeof DASHBOARD_WINDOW_OPTIONS[number]['value'];

export const useDashboard = () => {
    const [selectedWindow, setSelectedWindow] = useState<DashboardWindow>('7d');

    const { 
        data: metrics, 
        isLoading: metricsLoading, 
        isRefetching: metricsRefetching,
        error: metricsError,
        refetch: refetchMetrics
    } = useQuery({
        queryKey: ['admin', 'metrics', selectedWindow],
        queryFn: () => adminSystemApi.metricsV2(selectedWindow),
        staleTime: 1000 * 60 * 10, // Cache metrics for 10 minutes
    });

    const { 
        data: activityData, 
        isLoading: activityLoading,
        refetch: refetchActivity
    } = useQuery({
        queryKey: ['admin', 'recent-activity'],
        queryFn: () => adminAnalyticsApi.recentActivity(8),
        staleTime: 1000 * 60 * 2, // Cache activity for 2 minutes
    });

    const recentActivity = activityData?.items?.slice(0, 8) ?? [];

    const fetchDashboard = async (window?: DashboardWindow) => {
        if (window) setSelectedWindow(window);
        await Promise.all([refetchMetrics(), refetchActivity()]);
    };

    return {
        metrics: metrics || null,
        recentActivity,
        selectedWindow,
        loading: metricsLoading || activityLoading,
        refreshing: metricsRefetching,
        error: metricsError ? (metricsError as Error).message : null,
        setSelectedWindow,
        fetchDashboard,
    };
};
