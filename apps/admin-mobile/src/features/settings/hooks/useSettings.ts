import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { toast } from '../../../lib/toast';

export const useSettings = () => {
    const { admin, logout, refreshMe } = useAuth();
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [otaChecking, setOtaChecking] = useState(false);
    const [otaStatus, setOtaStatus] = useState('');

    useEffect(() => {
        setTotpEnabled(Boolean(admin?.totpEnabled));
    }, [admin?.totpEnabled]);

    const fetchStatus = useCallback(async () => {
        try {
            await refreshMe();
        } catch {
            // Keep the existing settings UI visible even if the refresh fails.
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshMe]);

    const handleLogout = useCallback(() => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
        ]);
    }, [logout]);

    const handleCheckUpdate = useCallback(async () => {
        if (__DEV__) {
            setOtaStatus('OTA updates are disabled in dev mode.');
            return;
        }

        setOtaChecking(true);
        setOtaStatus('');

        try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable) {
                setOtaStatus('Update available, downloading...');
                await Updates.fetchUpdateAsync();
                Alert.alert(
                    'Update Ready',
                    'A new version has been downloaded. Restart to apply it now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Restart Now', onPress: () => void Updates.reloadAsync() },
                    ],
                );
                setOtaStatus('Update downloaded. Restart to apply.');
            } else {
                setOtaStatus('You are already on the latest version.');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Update check failed.';
            setOtaStatus(message);
            toast.error('OTA check failed', message);
        } finally {
            setOtaChecking(false);
        }
    }, []);

    const appVersion = Constants.expoConfig?.version ?? '-';
    const runtimeVersion = typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '-';
    const channel = Updates.channel ?? (__DEV__ ? 'development' : '-');
    const updateId = Updates.updateId ? `${String(Updates.updateId).slice(0, 8)}...` : 'embedded';

    return {
        admin,
        totpEnabled,
        loading,
        refreshing,
        setRefreshing,
        otaChecking,
        otaStatus,
        fetchStatus,
        handleLogout,
        handleCheckUpdate,
        appVersion,
        runtimeVersion,
        channel,
        updateId,
        logout,
    };
};
