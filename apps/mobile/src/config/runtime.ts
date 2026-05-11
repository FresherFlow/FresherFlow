function normalizeUrl(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim();
    if (!raw) return fallback;
    try {
        return new URL(raw).origin.replace(/\/+$/, '');
    } catch {
        try {
            return new URL(`https://${raw}`).origin.replace(/\/+$/, '');
        } catch {
            return fallback;
        }
    }
}

function normalizePrefixList(value: string | undefined, fallback: string[]): string[] {
    const raw = (value || '').trim();
    if (!raw) return fallback;
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => normalizeUrl(item, item));
}

export const MOBILE_SITE_URL = normalizeUrl(
    process.env.EXPO_PUBLIC_SITE_URL,
    'http://localhost:3000'
);

export const MOBILE_LINKING_PREFIXES = normalizePrefixList(
    process.env.EXPO_PUBLIC_LINKING_PREFIXES,
    [MOBILE_SITE_URL]
);
