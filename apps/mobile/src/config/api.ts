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

const PROD_CDN_URL = 'https://cdn.fresherflow.in';

function resolveCdnUrl(): string {
    return PROD_CDN_URL;
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

