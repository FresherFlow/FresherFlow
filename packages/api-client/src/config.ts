/**
 * Inferred Base URL for the FresherFlow API across different environments.
 * 
 * NEXT_PUBLIC_API_URL: for Web (Next.js)
 * EXPO_PUBLIC_API_URL: for Mobile (Expo)
 * 
 * Also handles Android emulator localhost fallback.
 */
export function getInferredBaseUrl(): string {
    return getUrl(['NEXT_PUBLIC_API_URL', 'EXPO_PUBLIC_API_URL', 'API_URL'], 'http://localhost:5000');
}

export function getInferredAdminBaseUrl(): string {
    const isSeparate = 
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_SEPARATE_ADMIN_API === 'true') ||
        (typeof process !== 'undefined' && process.env?.USE_SEPARATE_ADMIN_API === 'true');

    if (!isSeparate) return getInferredBaseUrl();

    return getUrl(['NEXT_PUBLIC_ADMIN_API_URL', 'ADMIN_API_URL'], getInferredBaseUrl());
}

function getUrl(keys: string[], localFallback: string): string {
    if (typeof process !== 'undefined') {
        for (const key of keys) {
            const val = process.env[key];
            if (val) return normalizeUrl(val);
        }
    }

    if (typeof window !== 'undefined' && (window as any)._FF_API_URL) {
        return normalizeUrl((window as any)._FF_API_URL);
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return localFallback;
        }
        return normalizeUrl(window.location.origin);
    }

    return localFallback;
}

function normalizeUrl(url: string): string {
    let normalized = url.replace(/\/+$/, '');
    
    // Patch Android emulator localhost
    if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
        normalized = normalized.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    
    return normalized;
}
