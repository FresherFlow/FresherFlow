import { Platform } from 'react-native';

const FALLBACK_API_URL = 'https://api-admin.fresherflow.in';

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
