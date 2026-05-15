import { Platform } from 'react-native';

import Constants from 'expo-constants';

const PROD_API_URL = 'https://api.fresherflow.in';
const DEV_LOCAL_URL = 'http://localhost:5000';

function resolveApiUrl(): string {
    // In production builds, use the real API
    if (!__DEV__) return PROD_API_URL;

    // Override via env var (e.g. for CI or custom setups)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    let baseUrl = (envUrl || DEV_LOCAL_URL).replace(/\/+$/, '');

    // Physical Device Fallback: In development, if using localhost,
    // try to resolve the machine's local IP via expo-constants.
    if (['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        if (debuggerHost) {
            const ip = debuggerHost.split(':')[0];
            if (ip) {
                baseUrl = `http://${ip}:5000`;
                console.log(`[mobile] Resolved physical device API to machine IP: ${baseUrl}`);
            }
        }
    }

    try {
        const parsed = new URL(baseUrl);
        // Android emulator cannot reach host via localhost — remap to 10.0.2.2
        if (Platform.OS === 'android' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
            parsed.hostname = '10.0.2.2';
            return parsed.toString().replace(/\/+$/, '');
        }
        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return baseUrl;
    }
}

export const API_URL = resolveApiUrl();

// Dynamically point to the same machine as the API for the bootstrap feed
export const BOOTSTRAP_FEED_URL = `${API_URL}/bootstrap-feed.min.json`;
