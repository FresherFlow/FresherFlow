import { Platform } from 'react-native';

const FALLBACK_API_URL = 'http://localhost:5000';

function resolveApiUrl(): string {
  const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL).replace(/\/+$/, '');

  try {
    const parsed = new URL(rawApiUrl);

    // Android cannot use host-machine localhost directly.
    if (Platform.OS === 'android' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/+$/, '');
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return rawApiUrl;
  }
}

export const API_URL = resolveApiUrl();

function resolveCdnUrl(): string {
  const envCdnUrl = process.env.EXPO_PUBLIC_CDN_URL;
  if (envCdnUrl) {
    return envCdnUrl.replace(/\/+$/, '');
  }
  return 'https://cdn.fresherflow.in';
}

export const CDN_URL = resolveCdnUrl();
export const BOOTSTRAP_FEED_URL = `${CDN_URL}/bootstrap-feed.min.json`;
export const FEED_VERSION_URL = `${CDN_URL}/feed-version.json`;
export const GET_CATEGORY_SHARD_URL = (id: string) => `${CDN_URL}/categories/${id}.json`;
