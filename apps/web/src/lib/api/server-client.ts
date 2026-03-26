

const DEFAULT_API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
function normalizeApiBase(raw?: string): string {
    const value = (raw || '').trim();
    if (!value) return '';
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return withProtocol.replace(/\/+$/, '');
}

const USER_API_URL = normalizeApiBase(process.env.USER_API_URL || process.env.NEXT_PUBLIC_USER_API_URL) || normalizeApiBase(DEFAULT_API_URL);
const USE_SEPARATE_ADMIN_API = process.env.USE_SEPARATE_ADMIN_API === 'true' || process.env.NEXT_PUBLIC_USE_SEPARATE_ADMIN_API === 'true';
const ADMIN_API_URL = USE_SEPARATE_ADMIN_API
    ? (normalizeApiBase(process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL) || normalizeApiBase(DEFAULT_API_URL))
    : normalizeApiBase(DEFAULT_API_URL);
const DEFAULT_PUBLIC_REVALIDATE_SECONDS = 120;

function resolveApiBase(endpoint: string) {
    if (endpoint.startsWith('/api/admin')) return ADMIN_API_URL;
    return USER_API_URL;
}

function shouldBypassCache(endpoint: string, method: string) {
    if (method !== 'GET' && method !== 'HEAD') return true;

    const privatePrefixes = [
        '/api/auth',
        '/api/admin',
        '/api/alerts',
        '/api/user',
        '/api/profile',
        '/api/account',
        '/api/tracker',
        '/api/feedback',
    ];

    return privatePrefixes.some((prefix) => endpoint.startsWith(prefix));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function serverApiClient<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { cookies, headers } = await import('next/headers');
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const headersStore = await headers();
    const host = headersStore.get('host') || 'admin.fresherflow.in';
    const proto = headersStore.get('x-forwarded-proto') || 'https';

    const headersObj: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-From': 'fresherflow-web',
        'Cookie': cookieHeader,
        'Origin': `${proto}://${host}`,
        'X-Forwarded-Host': host,
        ...(options.headers as Record<string, string> || {}),
    };
    const method = (options.method || 'GET').toUpperCase();
    const hasExplicitCacheConfig = options.cache !== undefined || options.next !== undefined;
    const cacheOptions = hasExplicitCacheConfig
        ? {}
        : shouldBypassCache(endpoint, method)
            ? { cache: 'no-store' as const }
            : { next: { revalidate: DEFAULT_PUBLIC_REVALIDATE_SECONDS } };

    try {
        const response = await fetch(`${resolveApiBase(endpoint)}${endpoint}`, {
            ...options,
            headers: headersObj,
            ...cacheOptions,
        });

        if (!response.ok) {
            let errorMessage = 'Request failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorData.error || errorMessage;
            } catch {
                if (response.status === 429) {
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server is temporarily unavailable. Please try again.';
                } else {
                    errorMessage = `Request failed (${response.status})`;
                }
            }
            throw new Error(errorMessage);
        }

        // Handle 204 No Content or empty responses
        const text = await response.text();
        return (text ? JSON.parse(text) : null) as T;
    } catch (error) {
        console.error(`mServer API Error (${endpoint}):`, error);
        throw error;
    }
}
