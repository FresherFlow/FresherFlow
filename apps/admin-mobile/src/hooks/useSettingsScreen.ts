import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

export const useSettingsScreen = () => {
    const { admin, logout, refreshMe } = useAuth();
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [otaChecking, setOtaChecking] = useState(false);
    const [otaStatus, setOtaStatus] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            await refreshMe();
            setTotpEnabled(Boolean(admin?.totpEnabled));
        } catch { /* silent */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admin, refreshMe]);

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
        ]);
    };

    const handleCheckUpdate = async () => {
        if (__DEV__) { 
            setOtaStatus('OTA updates are disabled in dev mode.'); 
            return; 
        }
        setOtaChecking(true);
        setOtaStatus('');
        try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable) {
                setOtaStatus('Update available — downloading…');
                await Updates.fetchUpdateAsync();
                Alert.alert(
                    'Update Ready',
                    'A new version has been downloaded. Restart to apply?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Restart Now', onPress: () => void Updates.reloadAsync() },
                    ],
                );
                setOtaStatus('Update downloaded. Restart to apply.');
            } else {
                setOtaStatus('You are on the latest version.');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Update check failed.';
            setOtaStatus(msg);
            toast.error('OTA check failed', msg);
        } finally {
            setOtaChecking(false);
        }
    };

    const appVersion = Constants.expoConfig?.version ?? '—';
    const runtimeVersion = typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '—';
    const channel = Updates.channel ?? (__DEV__ ? 'development' : '—');
    const updateId = Updates.updateId ? String(Updates.updateId).slice(0, 8) + '…' : 'embedded';

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
        logout
    };
};
