import { Platform } from 'react-native';

const PROD_API_URL = 'https://api.fresherflow.in';
const DEV_LOCAL_URL = 'http://localhost:5000';

function resolveApiUrl(): string {
    // In production builds, use the real API
    if (!__DEV__) return PROD_API_URL;

    // Override via env var (e.g. for CI or custom setups)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    const baseUrl = (envUrl || DEV_LOCAL_URL).replace(/\/+$/, '');

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
