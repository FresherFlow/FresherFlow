import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const DEV_LOCAL_URL = 'http://localhost:5000';

function resolveApiUrl(): string {
    // Read directly from environment variable (injected at build time or local .env)
    let envUrl = process.env.EXPO_PUBLIC_API_URL;
    let baseUrl = DEV_LOCAL_URL;

    if (envUrl) {
        baseUrl = envUrl.replace(/\/+$/, '');
    }

    // If the base URL hostname is the Android loopback (10.0.2.2) but we are on iOS,
    // remap it to localhost so it works out of the box in the iOS Simulator.
    try {
        const parsed = new URL(baseUrl);
        if (Platform.OS === 'ios' && parsed.hostname === '10.0.2.2') {
            parsed.hostname = 'localhost';
            baseUrl = parsed.toString().replace(/\/+$/, '');
        }
    } catch {
        // Fallback
    }

    // Physical Device Fallback: In development, if using localhost, 127.0.0.1, or 10.0.2.2
    // try to resolve the machine's local IP via expo-constants.
    try {
        const parsed = new URL(baseUrl);
        if (Device.isDevice && ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname)) {
            const debuggerHost = Constants.expoConfig?.hostUri;
            if (debuggerHost) {
                const ip = debuggerHost.split(':')[0];
                if (ip) {
                    parsed.hostname = ip;
                    baseUrl = parsed.toString().replace(/\/+$/, '');
                    console.log(`[mobile] Resolved physical device API to machine IP: ${baseUrl}`);
                }
            }
        }
    } catch {
        // Fallback
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

function resolveCdnUrl(): string {
    const envCdnUrl = process.env.EXPO_PUBLIC_CDN_URL;
    if (envCdnUrl) return envCdnUrl.replace(/\/+$/, '');

    // In development, the local API server handles serving the CDN files dynamically
    if (__DEV__) {
        return API_URL;
    }

    // Fallback to normal production CDN if not configured in environment
    return 'https://cdn.fresherflow.in';
}

export const CDN_URL = resolveCdnUrl();

// Dynamically point to the CDN (Cloudflare R2 + Worker in prod, local Express in dev)
export const BOOTSTRAP_FEED_URL = `${CDN_URL}/bootstrap-feed.min.json`;
export const FEED_VERSION_URL = `${CDN_URL}/feed-version.json`;
export const TAKEN_USERNAMES_URL = `${CDN_URL}/taken-usernames.min.json`;
export const GET_CATEGORY_SHARD_URL = (id: string) => `${CDN_URL}/categories/${id}.json`;
export const EDUCATION_METADATA_URL = `${CDN_URL}/education.json`;
export const SKILLS_METADATA_URL = `${CDN_URL}/skills.json`;
export const CITIES_METADATA_URL = `${CDN_URL}/cities.json`;
