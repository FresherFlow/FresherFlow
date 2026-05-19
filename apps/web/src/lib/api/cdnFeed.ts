import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
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

function signPathname(pathname: string, secret: string): { t: number; sig: string } {
    const t = Math.floor(Date.now() / 1000);
    const message = `${pathname}:${t}`;
    const sig = crypto.createHmac('sha256', secret).update(message).digest('hex');
    return { t, sig };
}

/**
 * Signs a CDN URL if executed on the server-side (Vercel builds / Next.js SSR)
 * to successfully pass through Cloudflare Worker request signature verification.
 */
function signUrlIfServer(url: string): string {
    const IS_SERVER = typeof window === 'undefined';
    if (!IS_SERVER) return url;

    const secret = process.env.CDN_SIGNATURE_SECRET;
    if (secret) {
        try {
            const parsedUrl = new URL(url, 'https://cdn.fresherflow.in');
            const pathname = parsedUrl.pathname;
            const isProtected = pathname === '/bootstrap-feed.min.json' ||
                                pathname === '/taken-usernames.min.json' ||
                                pathname === '/companies-directory.min.json' ||
                                pathname.startsWith('/categories/');

            if (isProtected) {
                const { t, sig } = signPathname(pathname, secret);
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

/**
 * Fetches the static bootstrap feed from the CDN.
 * This is used for "Zero-Spinner" instant discovery and SEO.
 */
export async function fetchBootstrapFeed(): Promise<BootstrapFeedResponse | null> {
    try {
        const url = signUrlIfServer(BOOTSTRAP_FEED_URL);

        const controller = new AbortController();
        // 15s timeout to comfortably tolerate sleeping Render cold starts on unprimed caches
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(url, getCDNFetchOptions({
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
