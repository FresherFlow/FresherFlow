import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { 
    adminSystemApi, 
    adminFeedbackApi, 
    telegramsApi, 
    socialPostsApi, 
    type ConfigHealth, 
    type FeedbackAlerts, 
    type TelegramBroadcastSummary, 
    type SocialPostSummary 
} from '@fresherflow/api-client';
import { toast } from '../../../lib/toast';

export const useSystem = () => {
    const [health, setHealth] = useState<ConfigHealth | null>(null);
    const [linkStats, setLinkStats] = useState<{ healthy: number; broken: number; retrying: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runningVerify, setRunningVerify] = useState(false);
    const [runningAlerts, setRunningAlerts] = useState(false);
    const [runningBackfill, setRunningBackfill] = useState(false);
    const [runningRefresh, setRunningRefresh] = useState(false);
    const [checkingOta, setCheckingOta] = useState(false);
    const [installingOta, setInstallingOta] = useState(false);
    const [otaAvailable, setOtaAvailable] = useState(false);
    const [otaStatusText, setOtaStatusText] = useState('Ready to check');
    const [dispatchLogs, setDispatchLogs] = useState<{ id: string; channel: string; status: string; sentAt: string | null; errorMessage?: string | null }[]>([]);
    const [feedbackAlerts, setFeedbackAlerts] = useState<FeedbackAlerts | null>(null);
    const [telegramSummary, setTelegramSummary] = useState<TelegramBroadcastSummary | null>(null);
    const [socialSummary, setSocialSummary] = useState<SocialPostSummary | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [h, l, logsResponse, feedback, telegram, social] = await Promise.all([
                adminSystemApi.configHealth(),
                adminSystemApi.verifyLinksStats(),
                adminSystemApi.alertDispatchLogs(20).catch(() => ({ logs: [] })),
                adminFeedbackApi.alerts().catch(() => null),
                telegramsApi.broadcasts({ limit: 1 }).catch(() => null),
                socialPostsApi.list({ page: 1 }).catch(() => null),
            ]);
            setHealth(h);
            setLinkStats(l as { healthy: number; broken: number; retrying: number });
            setDispatchLogs((logsResponse as { logs: any[] }).logs ?? []);
            setFeedbackAlerts(feedback);
            setTelegramSummary(telegram?.summary ?? null);
            setSocialSummary(social?.summary ?? null);
        } catch {
            // fail silently
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const runVerification = useCallback(async () => {
        setRunningVerify(true);
        try {
            const res = await adminSystemApi.verifyLinks();
            toast.success('Verification done', `Checked: ${res.checked ?? '?'} · Broken: ${res.broken ?? '?'}`);
            void fetchAll();
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Failed to run verification';
            toast.error('Verify failed', message);
        } finally {
            setRunningVerify(false);
        }
    }, [fetchAll]);

    const runAlerts = useCallback(async () => {
        setRunningAlerts(true);
        try {
            const res = await adminSystemApi.runAlerts();
            toast.success('Alerts cycle done', `Sent: ${res.sent ?? 0}`);
            void fetchAll();
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Failed to run alerts';
            toast.error('Alerts failed', message);
        } finally {
            setRunningAlerts(false);
        }
    }, [fetchAll]);

    const runBackfill = useCallback(() => {
        Alert.alert('Backfill New-Job Alerts?', 'This re-sends NEW_JOB alerts for all jobs published in the last 72 hours.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Run Backfill', style: 'default', onPress: async () => {
                    setRunningBackfill(true);
                    try {
                        const res = await adminSystemApi.backfillAlerts();
                        toast.success('Backfill done', `Processed: ${res.processed ?? '?'} · Notified: ${res.usersSent ?? '?'}`);
                        void fetchAll();
                    } catch (e: unknown) {
                        const message = (e as { message?: string })?.message || 'Backfill failed';
                        toast.error('Backfill failed', message);
                    } finally {
                        setRunningBackfill(false);
                    }
                }
            }
        ]);
    }, [fetchAll]);

    const refreshMetrics = useCallback(async () => {
        setRunningRefresh(true);
        try {
            await adminSystemApi.metricsRefresh();
            toast.success('Done', 'Metrics cache refreshed.');
        } catch (e: unknown) {
            const message = (e as { message?: string })?.message || 'Refresh failed';
            toast.error('Refresh failed', message);
        } finally {
            setRunningRefresh(false);
        }
    }, []);

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

    return {
        health,
        linkStats,
        loading,
        refreshing,
        setRefreshing,
        runningVerify,
        runningAlerts,
        runningBackfill,
        runningRefresh,
        checkingOta,
        installingOta,
        otaAvailable,
        otaStatusText,
        dispatchLogs,
        feedbackAlerts,
        telegramSummary,
        socialSummary,
        fetchAll,
        runVerification,
        runAlerts,
        runBackfill,
        refreshMetrics,
        checkForOtaUpdate,
        installOtaUpdate
    };
};
