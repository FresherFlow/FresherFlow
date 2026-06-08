import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const DEV_LOCAL_URL = 'http://localhost:5000';
const DEFAULT_CDN_URL = 'https://cdn.fresherflow.in';

function resolveLocalUrl(envUrl: string | undefined, defaultUrl: string): string {
    let baseUrl = defaultUrl;

    if (envUrl) {
        baseUrl = envUrl.replace(/\/+$/, '');
    }

    try {
        const parsed = new URL(baseUrl);
        if (Platform.OS === 'ios' && parsed.hostname === '10.0.2.2') {
            parsed.hostname = 'localhost';
            baseUrl = parsed.toString().replace(/\/+$/, '');
        }
    } catch {
        // Fallback
    }

    try {
        const parsed = new URL(baseUrl);
        if (Device.isDevice && ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname)) {
            const debuggerHost = Constants.expoConfig?.hostUri;
            if (debuggerHost) {
                const ip = debuggerHost.split(':')[0];
                if (ip) {
                    parsed.hostname = ip;
                    baseUrl = parsed.toString().replace(/\/+$/, '');
                    console.log(`[mobile] Resolved physical device URL to machine IP: ${baseUrl}`);
                }
            }
        }
    } catch {
        // Fallback
    }

    try {
        const parsed = new URL(baseUrl);
        if (Platform.OS === 'android' && !Device.isDevice && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
            parsed.hostname = '10.0.2.2';
            return parsed.toString().replace(/\/+$/, '');
        }
        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return baseUrl;
    }
}

export const API_URL = resolveLocalUrl(process.env.EXPO_PUBLIC_API_URL, DEV_LOCAL_URL);

function resolveCdnUrl(): string {
    const envCdnUrl = process.env.EXPO_PUBLIC_CDN_URL;
    if (envCdnUrl) {
        const resolvedEnvCdnUrl = resolveLocalUrl(envCdnUrl, envCdnUrl);
        const allowLocalCdn = process.env.EXPO_PUBLIC_USE_LOCAL_CDN === 'true';

        try {
            const host = new URL(resolvedEnvCdnUrl).hostname;
            const isLocalCdn =
                host === 'localhost' ||
                host === '127.0.0.1' ||
                host === '10.0.2.2' ||
                /^192\.168\./.test(host) ||
                /^10\./.test(host) ||
                /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

            if (isLocalCdn && !allowLocalCdn) {
                console.warn('[mobile] Ignoring local CDN URL. Set EXPO_PUBLIC_USE_LOCAL_CDN=true to use it:', resolvedEnvCdnUrl);
                return DEFAULT_CDN_URL;
            }
        } catch {
            return DEFAULT_CDN_URL;
        }

        return resolvedEnvCdnUrl;
    }

    // CDN reads must not depend on the API process. Use EXPO_PUBLIC_CDN_URL
    // only when intentionally testing local static feed files through Express.
    return DEFAULT_CDN_URL;
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
export const RESOURCES_FEED_URL = `${CDN_URL}/resources-feed.json`;
export const GOVERNMENT_FEED_URL = `${CDN_URL}/government-feed.json`;

export function getApiUrlForSector(sector: string | null): string {
    if (sector === 'GOVERNMENT') {
        return resolveLocalUrl(undefined, DEV_LOCAL_URL);
    }
    return API_URL;
}

export function configureApiClientForSector(sector: string | null) {
    const finalApiUrl = getApiUrlForSector(sector);
    console.log(`[mobile] Re-configuring API client for sector ${sector}: ${finalApiUrl}`);

    const { configureClient, HttpError } = require('@fresherflow/api-client');
    const { secureStorage } = require('@repo/frontend-core');
    const { useAuthStore } = require('../store/useAuthStore');

    configureClient(finalApiUrl, secureStorage, {
      onError: (err: any) => {
        if (err instanceof HttpError && err.status === 401) {
          const { isAuthenticated, triggerHandshake } = useAuthStore.getState();
          if (isAuthenticated) {
            console.log('[Auth] Detected 401 Unauthorized, triggering re-handshake...');
            triggerHandshake();
          }
        }
      }
    });
}


