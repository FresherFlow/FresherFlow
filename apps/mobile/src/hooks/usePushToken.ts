import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { deviceTokenApi } from '@fresherflow/api-client';

/**
 * Registers the device's FCM push token with the backend after login.
 * Also listens for token refreshes and re-registers automatically.
 *
 * Must only be called when the user is authenticated (has a valid access token).
 */
export function usePushToken() {
    const registeredState = useRef<{ token: string } | null>(null);

    useEffect(() => {
        let unsubscribeRefresh: (() => void) | null = null;

        const registerToken = async (token: string) => {
            const isSame = registeredState.current?.token === token;
            if (isSame) return; // already registered this token
            
            try {
                const platform = Platform.OS === 'ios' ? 'ios' : 'android';
                await deviceTokenApi.register(token, platform);
                registeredState.current = { token };
            } catch {
                // Non-critical — pushes will still work via FCM topics, just not targeted pushes
            }
        };

        const init = async () => {
            try {
                const messaging = require('@react-native-firebase/messaging').default;

                // Request permission (iOS requires explicit permission, Android 13+ too)
                const authStatus = await messaging().requestPermission();
                const enabled =
                    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

                if (!enabled) return;

                // Get the current token and register it
                const token = await messaging().getToken();
                if (token) {
                    void registerToken(token);
                }

                // Listen for token refreshes (FCM rotates tokens periodically)
                unsubscribeRefresh = messaging().onTokenRefresh((newToken: string) => {
                    void registerToken(newToken);
                });
            } catch {
                // FCM not available in this build — safe to ignore
            }
        };

        void init();

        return () => {
            unsubscribeRefresh?.();
        };
    // Re-register only on mount/refresh
    }, []);
}
