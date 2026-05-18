import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    adminSystemApi, 
    adminFeedbackApi, 
    telegramsApi, 
    socialPostsApi, 
} from '@fresherflow/api-client';
import { toast } from '../../../lib/toast';
import { type DispatchLog } from '../components/DispatchLogCard';

/**
 * Hook for managing system configuration, health, and administrative actions.
 * Uses useQuery for standardized caching and local-first data availability.
 */
export const useSystem = () => {
    const queryClient = useQueryClient();
    const [runningVerify, setRunningVerify] = useState(false);
    const [runningAlerts, setRunningAlerts] = useState(false);
    const [runningBackfill, setRunningBackfill] = useState(false);
    const [runningRefresh, setRunningRefresh] = useState(false);
    
    // OTA State
    const [checkingOta, setCheckingOta] = useState(false);
    const [installingOta, setInstallingOta] = useState(false);
    const [otaAvailable, setOtaAvailable] = useState(false);
    const [otaStatusText, setOtaStatusText] = useState('Ready to check');

    // System Queries
    const { data: health = null, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
        queryKey: ['admin', 'system', 'health'],
        queryFn: () => adminSystemApi.configHealth(),
        staleTime: 1000 * 60 * 5,
    });

    const { data: linkStats = null, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['admin', 'system', 'link-stats'],
        queryFn: () => adminSystemApi.verifyLinksStats() as Promise<{ healthy: number; broken: number; retrying: number }>,
        staleTime: 1000 * 60 * 5,
    });

    const { data: logsResponse = null, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['admin', 'system', 'dispatch-logs'],
        queryFn: () => adminSystemApi.alertDispatchLogs(20).catch(() => ({ logs: [] })),
        staleTime: 1000 * 60 * 2,
    });

    const { data: feedbackAlerts = null, isLoading: feedbackLoading, refetch: refetchFeedback } = useQuery({
        queryKey: ['admin', 'feedback', 'alerts'],
        queryFn: () => adminFeedbackApi.alerts().catch(() => null),
        staleTime: 1000 * 60 * 5,
    });

    const { data: telegramSummaryResponse = null, isLoading: telegramLoading, refetch: refetchTelegram } = useQuery({
        queryKey: ['admin', 'telegrams', 'summary'],
        queryFn: () => telegramsApi.broadcasts({ limit: 1 }).catch(() => null),
        staleTime: 1000 * 60 * 5,
    });

    const { data: socialSummaryResponse = null, isLoading: socialLoading, refetch: refetchSocial } = useQuery({
        queryKey: ['admin', 'social', 'summary'],
        queryFn: () => socialPostsApi.list({ page: 1 }).catch(() => null),
        staleTime: 1000 * 60 * 5,
    });

    const fetchAll = useCallback(async () => {
        await Promise.all([
            refetchHealth(),
            refetchStats(),
            refetchLogs(),
            refetchFeedback(),
            refetchTelegram(),
            refetchSocial(),
        ]);
    }, [refetchHealth, refetchStats, refetchLogs, refetchFeedback, refetchTelegram, refetchSocial]);

    const runVerification = useCallback(async () => {
        setRunningVerify(true);
        try {
            const res = await adminSystemApi.verifyLinks();
            toast.success('Verification done', `Checked: ${res.checked ?? '?'} · Broken: ${res.broken ?? '?'}`);
            void refetchStats();
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Failed to run verification';
            toast.error('Verify failed', message);
        } finally {
            setRunningVerify(false);
        }
    }, [refetchStats]);

    const runAlerts = useCallback(async () => {
        setRunningAlerts(true);
        try {
            const res = await adminSystemApi.runAlerts();
            toast.success('Alerts cycle done', `Sent: ${res.sent ?? 0}`);
            void refetchLogs();
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Failed to run alerts';
            toast.error('Alerts failed', message);
        } finally {
            setRunningAlerts(false);
        }
    }, [refetchLogs]);

    const runBackfill = useCallback(() => {
        Alert.alert('Backfill New-Job Alerts?', 'This re-sends NEW_JOB alerts for all jobs published in the last 72 hours.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Run Backfill', style: 'default', onPress: async () => {
                    setRunningBackfill(true);
                    try {
                        const res = await adminSystemApi.backfillAlerts();
                        toast.success('Backfill done', `Processed: ${res.processed ?? '?'} · Notified: ${res.usersSent ?? '?'}`);
                        void refetchLogs();
                    } catch (e: unknown) {
                        const message = (e as { message?: string })?.message || 'Backfill failed';
                        toast.error('Backfill failed', message);
                    } finally {
                        setRunningBackfill(false);
                    }
                }
            }
        ]);
    }, [refetchLogs]);

    const refreshMetrics = useCallback(async () => {
        setRunningRefresh(true);
        try {
            await adminSystemApi.metricsRefresh();
            toast.success('Done', 'Metrics cache refreshed.');
            void queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Refresh failed';
            toast.error('Refresh failed', message);
        } finally {
            setRunningRefresh(false);
        }
    }, [queryClient]);

    const checkForOtaUpdate = useCallback(async () => {
        if (__DEV__) { Alert.alert('Development Build', 'OTA checks disabled in dev mode.'); return; }
        setCheckingOta(true);
        setOtaStatusText('Checking for updates…');
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setOtaAvailable(true); setOtaStatusText('Update available');
            } else {
                setOtaAvailable(false); setOtaStatusText('No updates found');
            }
        } catch {
            setOtaAvailable(false);
            setOtaStatusText('Failed to check updates');
        } finally {
            setCheckingOta(false);
        }
    }, []);

    const installOtaUpdate = useCallback(async () => {
        if (__DEV__) { Alert.alert('Development Build', 'OTA install disabled in dev mode.'); return; }
        setInstallingOta(true);
        setOtaStatusText('Downloading…');
        try {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Unknown error';
            setOtaStatusText('Failed to install update');
            toast.error('OTA install failed', message);
        } finally {
            setInstallingOta(false);
        }
    }, []);

    const isLoading = healthLoading || statsLoading || logsLoading || feedbackLoading || telegramLoading || socialLoading;

    return {
        health,
        linkStats,
        loading: isLoading,
        refreshing: isLoading,
        setRefreshing: () => {}, // Handled by react-query
        runningVerify,
        runningAlerts,
        runningBackfill,
        runningRefresh,
        checkingOta,
        installingOta,
        otaAvailable,
        otaStatusText,
        dispatchLogs: (logsResponse?.logs ?? []) as DispatchLog[],
        feedbackAlerts: feedbackAlerts,
        telegramSummary: telegramSummaryResponse?.summary ?? null,
        socialSummary: socialSummaryResponse?.summary ?? null,
        fetchAll,
        runVerification,
        runAlerts,
        runBackfill,
        refreshMetrics,
        checkForOtaUpdate,
        installOtaUpdate
    };
};
