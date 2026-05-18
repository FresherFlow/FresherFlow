import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
    GET_CATEGORY_SHARD_URL, 
    SITE_URL, 
    EDUCATION_METADATA_URL, 
    SKILLS_METADATA_URL 
} from '../runtimeConfig';

export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

/**
 * Generates correct fetch options for the static CDN.
 * On server-side (Vercel builds, Next.js SSR), it attaches the pre-shared X-CDN-Build-Token header
 * to instantly pass Cloudflare Worker validation without needing short-lived cryptographic signatures.
 */
function getCDNFetchOptions(options: RequestInit = {}): RequestInit {
    const IS_SERVER = typeof window === 'undefined';
    const headers = new Headers(options.headers || {});

    if (IS_SERVER) {
        const buildToken = process.env.CDN_BUILD_TOKEN;
        if (buildToken) {
            headers.set('X-CDN-Build-Token', buildToken);
        }
    }
    
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
        const url = BOOTSTRAP_FEED_URL;

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
        const url = GET_CATEGORY_SHARD_URL(id);

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
        const url = EDUCATION_METADATA_URL;
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
        const url = SKILLS_METADATA_URL;
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
