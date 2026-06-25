import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
    EXPIRED_FEED_URL,
    FEED_VERSION_URL,
    GET_CATEGORY_SHARD_URL, 
    GET_COMPANY_SHARD_URL,
    SITE_URL, 
    EDUCATION_METADATA_URL, 
    SKILLS_METADATA_URL,
    COMPANIES_METADATA_URL,
    SITEMAP_DATA_URL,
    API_URL,
    GOVERNMENT_FEED_URL,
    CDN_URL
} from '@/lib/utils/runtimeConfig';
export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

type FeedVersion = {
    version: string;
    stable: boolean;
};

type CDNFetchOptions = RequestInit & {
    next?: {
        revalidate?: false | number;
        tags?: string[];
    };
};

async function signMessage(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const key = await globalThis.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await globalThis.crypto.subtle.sign(
        'HMAC',
        key,
        messageData
    );
    
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Signs a CDN URL using a stable feed version string.
 * The resulting URL is identical until the next job publish event,
 * enabling indefinite CDN caching (immutable cache headers from Edge Worker).
 * Used for the bootstrap feed on the web/Next.js server side.
 */
async function signUrlWithVersion(url: string, version: string): Promise<string> {
    const secret = process.env.CDN_SIGNATURE_SECRET || process.env.EXPO_PUBLIC_CDN_SIGNATURE_SECRET;
    if (!secret) return url;
    try {
        const parsedUrl = new URL(url, CDN_URL);
        const pathname = parsedUrl.pathname;
        const message = `${pathname}:${version}`;
        const sig = await signMessage(message, secret);
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
async function signUrlIfServer(url: string): Promise<string> {
    const IS_SERVER = typeof window === 'undefined';
    if (!IS_SERVER) return url;

    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (secret) {
        try {
            const parsedUrl = new URL(url, CDN_URL);
            const pathname = parsedUrl.pathname;
            const isProtected = pathname === '/taken-usernames.min.json' ||
                                pathname === '/companies-directory.min.json' ||
                                pathname.startsWith('/categories/');

            if (isProtected) {
                const t = Math.floor(Date.now() / 1000 / 120) * 120;
                const message = `${pathname}:${t}`;
                const sig = await signMessage(message, secret);
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
 * Returns the CDN fetch timeout in ms.
 * During production build, Next.js renders all generateStaticParams pages
 * concurrently from one machine — this saturates CDN connections and 3.5s
 * is too short. At runtime, 3.5s fast-fails bots hitting non-existent slugs.
 */
function getCDNTimeout(): number {
    return process.env.NEXT_PHASE === 'phase-production-build' ? 12000 : 3500;
}

/**
 * Generates correct fetch options for the static CDN.
 */
function getCDNFetchOptions(options: CDNFetchOptions = {}): CDNFetchOptions {
    const headers = new Headers(options.headers || {});
    headers.set('Origin', SITE_URL || 'https://fresherflow.com');
    return {
        ...options,
        headers,
    };
}

/**
 * Fetches the centrally stored R2 feed version through Next's tagged cache.
 */
export async function fetchFeedVersion(): Promise<FeedVersion> {
    try {
        const res = await fetch(FEED_VERSION_URL, {
            next: { revalidate: false, tags: ['feed-version'] },
        });
        if (res.ok) {
            const data = await res.json() as { version?: string };
            if (data?.version) {
                return { version: data.version, stable: true };
            }
        }
    } catch (err) {
        console.warn('Failed to fetch feed version, using uncached fallback:', err instanceof Error ? err.message : err);
    }
    return { version: 'fallback', stable: false };
}

/**
 * Fetches the static bootstrap feed from the CDN.
 * This is used for "Zero-Spinner" instant discovery and SEO.
 */
export async function fetchBootstrapFeed(forceLive = false, customTags?: string[]): Promise<BootstrapFeedResponse | null> {
    try {
        const shouldBypassDevFeed = true;
        if (process.env.NODE_ENV === 'development' && !forceLive && !shouldBypassDevFeed) {
            try {
                const res = await fetch(`${API_URL}/bootstrap-feed.min.json`, { cache: 'no-store' });
                if (res.ok) {
                    return await res.json() as BootstrapFeedResponse;
                }
            } catch (err) {
                console.warn('Failed to fetch live bootstrap feed from local API server, falling back to dummy-feed.json:', err);
            }
            const res = await fetch(`${SITE_URL || 'http://localhost:3000'}/dummy-feed.json`, { cache: 'no-store' });
            return await res.json() as BootstrapFeedResponse;
        }

        const feedVersion = await fetchFeedVersion();

        // Sign using the stable version string — URL stays identical until next publish event,
        // allowing Vercel / Cloudflare edges to cache it indefinitely (immutable).
        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(BOOTSTRAP_FEED_URL, feedVersion.version)
            : `${BOOTSTRAP_FEED_URL}?v=${feedVersion.version}`;

        const controller = new AbortController();
        // 10s timeout — a cache hit should respond in <100ms; this guards only cold misses
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            // Cache only stable feed-version URLs. If feed-version.json is down,
            // use no-store so a fallback URL cannot create repeated cache writes.
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: false, tags: customTags ?? ['homepage-feed'] } } : {}),
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
export async function fetchExpiredFeed(customTags?: string[]): Promise<BootstrapFeedResponse | null> {
    try {
        if (process.env.NODE_ENV === 'development') {
            return null; // Don't mock expired feed in dev for now
        }

        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(EXPIRED_FEED_URL, feedVersion.version)
            : `${EXPIRED_FEED_URL}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: false, tags: customTags ?? ['expired-feed'] } } : {}),
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
 * Fetches the static government jobs feed from the CDN.
 */
export async function fetchGovernmentFeed(forceLive = false, customTags?: string[]): Promise<BootstrapFeedResponse | null> {
    try {
        if (process.env.NODE_ENV === 'development' && !forceLive) {
            try {
                const res = await fetch(`${API_URL}/government-feed.json`, { cache: 'no-store' });
                if (res.ok) {
                    return await res.json() as BootstrapFeedResponse;
                }
            } catch (err) {
                console.warn('Failed to fetch live government feed from local API server, falling back:', err);
            }
        }

        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(GOVERNMENT_FEED_URL, feedVersion.version)
            : `${GOVERNMENT_FEED_URL}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: false, tags: customTags ?? ['government-feed'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Failed to fetch government feed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json() as BootstrapFeedResponse;
        
        if (!data || !Array.isArray(data.opportunities)) {
            console.error('Invalid government feed format');
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Government CDN fetch failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Fetches a specific category shard (e.g. trending, remote, 2026)
 */
export async function fetchCategoryShard(id: string, customTags?: string[]): Promise<BootstrapFeedResponse | null> {
    try {
        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const rawUrl = GET_CATEGORY_SHARD_URL(id);
        const url = IS_SERVER
            ? await signUrlWithVersion(rawUrl, feedVersion.version)
            : `${rawUrl}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, getCDNFetchOptions({
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: false, tags: customTags ?? [`category-${id}`, 'category-shards'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const data = await res.json() as BootstrapFeedResponse;

        return data;
    } catch (err) {
        console.warn(`Failed to fetch shard ${id}:`, err);
        return null;
    }
}

/**
 * Fetches a specific company shard (e.g. google, microsoft)
 */
export async function fetchCompanyShard(slug: string, customTags?: string[]): Promise<BootstrapFeedResponse | null> {
    try {
        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const rawUrl = GET_COMPANY_SHARD_URL(slug);
        const url = IS_SERVER
            ? await signUrlWithVersion(rawUrl, feedVersion.version)
            : `${rawUrl}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getCDNTimeout());

        const res = await fetch(url, getCDNFetchOptions({
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: false, tags: customTags ?? [`company-${slug}`, 'company-shards'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const data = await res.json() as BootstrapFeedResponse;

        return data;
    } catch (err) {
        console.warn(`Failed to fetch company shard ${slug}:`, err);
        return null;
    }
}

export interface EducationMetadata {
    educationLevels: string[];
    courses: Record<string, string[]>;
    specializations: Record<string, string[]>;
}

/**
 * Fetches education metadata from CDN through Next's tagged cache.
 */
export async function fetchEducationMetadata(): Promise<EducationMetadata | null> {
    try {
        const url = await signUrlIfServer(EDUCATION_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['education-metadata'] },
        }));
        if (!res.ok) return null;
            return await res.json() as EducationMetadata;
    } catch (err) {
        console.warn('Failed to fetch education metadata from CDN:', err);
        return null;
    }
}

/**
 * Fetches skills list from CDN through Next's tagged cache.
 */
export async function fetchSkillsMetadata(): Promise<string[] | null> {
    try {
        const url = await signUrlIfServer(SKILLS_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['skills-metadata'] },
        }));
        if (!res.ok) return null;
        return await res.json() as string[];
    } catch (err) {
        console.warn('Failed to fetch skills metadata from CDN:', err);
        return null;
    }
}

/**
 * Fetches companies list from CDN.
 */
export async function fetchCompaniesMetadata(): Promise<string[] | null> {
    try {

        const url = await signUrlIfServer(COMPANIES_METADATA_URL);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getCDNTimeout());
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['companies-metadata'] },
            signal: controller.signal,
        }));
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        return await res.json() as string[];
    } catch (err) {
        console.warn('Failed to fetch companies metadata from CDN:', err);
        return null;
    }
}

export interface SitemapDataResponse {
    companies: Array<{ name: string; slug: string }>;
    opportunities: Array<{
        id: string;
        slug: string | null;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT';
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
        const url = await signUrlIfServer(SITEMAP_DATA_URL);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['sitemap-data'] },
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
