import { useState } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { toast } from '../../lib/toast';

export type OtaState = {
    checking: boolean;
    statusText: string;
    appVersion: string;
    runtimeVersion: string;
    channel: string;
    updateId: string;
};

export const useOtaManager = () => {
    const [checking, setChecking] = useState(false);
    const [statusText, setStatusText] = useState('');

    const checkForUpdate = async () => {
        if (__DEV__) {
            setStatusText('OTA updates are disabled in dev mode.');
            return;
        }

        setChecking(true);
        setStatusText('');

        try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable) {
                setStatusText('Update available — downloading…');
                await Updates.fetchUpdateAsync();

                Alert.alert(
                    'Update Ready',
                    'A new version has been downloaded. Restart to apply?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Restart Now', onPress: () => void Updates.reloadAsync() },
                    ],
                );

                setStatusText('Update downloaded. Restart to apply.');
            } else {
                setStatusText('You are on the latest version.');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Update check failed.';
            setStatusText(msg);
            toast.error('OTA check failed', msg);
        } finally {
            setChecking(false);
        }
    };

    const appVersion = Constants.expoConfig?.version ?? '—';
    const runtimeVersion = typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '—';
    const channel = Updates.channel ?? (__DEV__ ? 'development' : '—');

    const updateId = Updates.updateId ? String(Updates.updateId).slice(0, 8) + '…' : 'embedded';

    const state: OtaState = {
        checking,
        statusText,
        appVersion,
        runtimeVersion,
        channel,
        updateId,
    };

    return {
        state,
        checkForUpdate,
    };
};


