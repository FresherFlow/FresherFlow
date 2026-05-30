import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
    EXPIRED_FEED_URL,
    FEED_VERSION_URL,
    GET_CATEGORY_SHARD_URL, 
    SITE_URL, 
    EDUCATION_METADATA_URL, 
    SKILLS_METADATA_URL,
    SITEMAP_DATA_URL
} from '../runtimeConfig';
import crypto from 'node:crypto';

export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

/**
 * Signs a CDN URL using a stable feed version string.
 * The resulting URL is identical until the next job publish event,
 * enabling indefinite CDN caching (immutable cache headers from Edge Worker).
 * Used for the bootstrap feed on the web/Next.js server side.
 */
function signUrlWithVersion(url: string, version: string): string {
    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (!secret) return url;
    try {
        const parsedUrl = new URL(url, 'https://cdn.fresherflow.in');
        const pathname = parsedUrl.pathname;
        const message = `${pathname}:${version}`;
        const sig = crypto.createHmac('sha256', secret).update(message).digest('hex');
        parsedUrl.searchParams.set('v', version);
        parsedUrl.searchParams.set('sig', sig);
        return parsedUrl.toString();
    } catch (err) {
        console.error('Failed to sign CDN url with version:', err);
        return url;
    }
}

/**
 * Signs a CDN URL using a rolling 2-minute timestamp window.
 * Used for protected paths that don't have a version yet (categories, usernames).
 * Remains safely within the Edge Worker's 5-minute replay attack window.
 */
function signUrlIfServer(url: string): string {
    const IS_SERVER = typeof window === 'undefined';
    if (!IS_SERVER) return url;

    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (secret) {
        try {
            const parsedUrl = new URL(url, 'https://cdn.fresherflow.in');
            const pathname = parsedUrl.pathname;
            const isProtected = pathname === '/taken-usernames.min.json' ||
                                pathname === '/companies-directory.min.json' ||
                                pathname.startsWith('/categories/');

            if (isProtected) {
                const t = Math.floor(Date.now() / 1000 / 120) * 120;
                const message = `${pathname}:${t}`;
                const sig = crypto.createHmac('sha256', secret).update(message).digest('hex');
                parsedUrl.searchParams.set('t', t.toString());
                parsedUrl.searchParams.set('sig', sig);
                return parsedUrl.toString();
            }
        } catch (err) {
            console.error('Failed to sign CDN url on server:', err);
        }
    }
    return url;
}

/**
 * Generates correct fetch options for the static CDN.
 */
function getCDNFetchOptions(options: RequestInit = {}): RequestInit {
    const headers = new Headers(options.headers || {});
    headers.set('Origin', SITE_URL || 'https://fresherflow.com');
    return {
        ...options,
        headers,
    };
}

let cachedVersion: string | null = null;
let lastVersionFetch = 0;

/**
 * Fetches the centrally stored R2 feed version without caching.
 */
export async function fetchFeedVersion(): Promise<string> {
    const now = Date.now();
    // Cache the version in-memory for 1 minute to avoid redundant fetches in the same render loop
    if (cachedVersion && (now - lastVersionFetch < 60000)) {
        return cachedVersion;
    }
    try {
        const res = await fetch(FEED_VERSION_URL, {
            next: { revalidate: 3600 },
        });
        if (res.ok) {
            const data = await res.json() as { version?: string };
            if (data && data.version) {
                cachedVersion = data.version;
                lastVersionFetch = now;
                return data.version;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch feed version, using timestamp:', err instanceof Error ? err.message : err);
    }
    // Fallback to a rounded 5-minute timestamp if R2 is down or unpopulated
    return Math.floor(now / 300000).toString();
}

/**
 * Fetches the static bootstrap feed from the CDN.
 * This is used for "Zero-Spinner" instant discovery and SEO.
 */
export async function fetchBootstrapFeed(): Promise<BootstrapFeedResponse | null> {
    try {
        if (process.env.NODE_ENV === 'development') {
            const res = await fetch(`${SITE_URL || 'http://localhost:3000'}/dummy-feed.json`, { cache: 'no-store' });
            return await res.json() as BootstrapFeedResponse;
        }

        const version = await fetchFeedVersion();
        // Sign using the stable version string — URL stays identical until next publish event,
        // allowing Vercel / Cloudflare edges to cache it indefinitely (immutable).
        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? signUrlWithVersion(BOOTSTRAP_FEED_URL, version)
            : `${BOOTSTRAP_FEED_URL}?v=${version}`;

        const controller = new AbortController();
        // 10s timeout — a cache hit should respond in <100ms; this guards only cold misses
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            next: { revalidate: 3600 },
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Failed to fetch bootstrap feed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json() as BootstrapFeedResponse;
        
        // Basic validation
        if (!data || !Array.isArray(data.opportunities)) {
            console.error('Invalid bootstrap feed format');
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Bootstrap CDN fetch failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Fetches the static expired feed from the CDN.
 * Used as a fallback by detail pages to prevent 404s for recently expired opportunities.
 */
export async function fetchExpiredFeed(): Promise<BootstrapFeedResponse | null> {
    try {
        if (process.env.NODE_ENV === 'development') {
            return null; // Don't mock expired feed in dev for now
        }

        const version = await fetchFeedVersion();
        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? signUrlWithVersion(EXPIRED_FEED_URL, version)
            : `${EXPIRED_FEED_URL}?v=${version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            next: { revalidate: 3600 },
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Failed to fetch expired feed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json() as BootstrapFeedResponse;
        
        if (!data || !Array.isArray(data.opportunities)) {
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Expired CDN fetch failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Fetches a specific category shard (e.g. trending, remote, 2026)
 */
export async function fetchCategoryShard(id: string): Promise<BootstrapFeedResponse | null> {
    try {
        const url = signUrlIfServer(GET_CATEGORY_SHARD_URL(id));

        const res = await fetch(url, getCDNFetchOptions({
            next: { revalidate: 3600 }
        }));

        if (!res.ok) return null;
        return await res.json() as BootstrapFeedResponse;
    } catch (err) {
        console.warn(`Failed to fetch shard ${id}:`, err);
        return null;
    }
}

export interface EducationMetadata {
    educationLevels: string[];
    courses: Record<string, string[]>;
    specializations: Record<string, string[]>;
}

/**
 * Fetches education metadata from CDN.
 */
export async function fetchEducationMetadata(): Promise<EducationMetadata | null> {
    try {
        const url = signUrlIfServer(EDUCATION_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            next: { revalidate: 86400 } // 24 hours cache
        }));
        if (!res.ok) return null;
        return await res.json() as EducationMetadata;
    } catch (err) {
        console.warn('Failed to fetch education metadata from CDN:', err);
        return null;
    }
}

/**
 * Fetches skills list from CDN.
 */
export async function fetchSkillsMetadata(): Promise<string[] | null> {
    try {
        const url = signUrlIfServer(SKILLS_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            next: { revalidate: 86400 } // 24 hours cache
        }));
        if (!res.ok) return null;
        return await res.json() as string[];
    } catch (err) {
        console.warn('Failed to fetch skills metadata from CDN:', err);
        return null;
    }
}

export interface SitemapDataResponse {
    companies: Array<{ name: string; slug: string }>;
    opportunities: Array<{
        id: string;
        slug: string | null;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        postedAt: string;
        updatedAt?: string;
    }>;
    timestamp: number;
}

/**
 * Fetches sitemap raw data (companies + up to 1000 opportunities) from the CDN.
 */
export async function fetchSitemapData(): Promise<SitemapDataResponse | null> {
    try {
        const url = signUrlIfServer(SITEMAP_DATA_URL);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(url, getCDNFetchOptions({
            next: { revalidate: 3600 },
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Failed to fetch sitemap data: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json() as SitemapDataResponse;
        
        if (!data || !Array.isArray(data.opportunities) || !Array.isArray(data.companies)) {
            console.error('Invalid sitemap data format');
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Sitemap CDN fetch failed:', err instanceof Error ? err.message : err);
        return null;
    }
}
