import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
    GET_CATEGORY_SHARD_URL, 
    SITE_URL, 
    EDUCATION_METADATA_URL, 
    SKILLS_METADATA_URL 
} from '../runtimeConfig';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
 * Fetches the static bootstrap feed from the CDN.
 * This is used for "Zero-Spinner" instant discovery and SEO.
 */
export async function fetchBootstrapFeed(): Promise<BootstrapFeedResponse | null> {
    try {
        // Server-side (Vercel build / Next.js SSR): fetch directly from Render API.
        // cdn.fresherflow.in has a Cloudflare Worker that blocks unsigned server requests.
        // api.fresherflow.in goes straight to Render with no Worker in front of it.
        const IS_SERVER = typeof window === 'undefined';
        let url: string;

        if (IS_SERVER) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
            url = `${apiBase}/bootstrap-feed.min.json`;
        } else {
            url = BOOTSTRAP_FEED_URL;
            const secret = process.env.CDN_SIGNATURE_SECRET;
            if (secret && (url.includes('cdn.fresherflow.in') || url.includes('fresherflow.pages.dev'))) {
                try {
                    const parsedUrl = new URL(url);
                    const { t, sig } = signPathname(parsedUrl.pathname, secret);
                    parsedUrl.searchParams.set('t', t.toString());
                    parsedUrl.searchParams.set('sig', sig);
                    url = parsedUrl.toString();
                } catch (err) {
                    console.error('Failed to sign CDN url:', err);
                }
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
            next: { revalidate: 3600 },
            signal: controller.signal,
        });


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
        let url = GET_CATEGORY_SHARD_URL(id);
        const secret = process.env.CDN_SIGNATURE_SECRET;
        if (secret && (url.includes('cdn.fresherflow.in') || url.includes('fresherflow.pages.dev'))) {
            try {
                const parsedUrl = new URL(url);
                const { t, sig } = signPathname(parsedUrl.pathname, secret);
                parsedUrl.searchParams.set('t', t.toString());
                parsedUrl.searchParams.set('sig', sig);
                url = parsedUrl.toString();
            } catch (err) {
                console.error('Failed to sign CDN category shard url:', err);
            }
        }

        const res = await fetch(url, {
            next: { revalidate: 3600 },
            headers: {
                'Origin': SITE_URL || 'https://fresherflow.com'
            }
        });

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
        const res = await fetch(url, {
            next: { revalidate: 86400 }, // 24 hours cache
            headers: {
                'Origin': SITE_URL || 'https://fresherflow.com'
            }
        });
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
        const res = await fetch(url, {
            next: { revalidate: 86400 }, // 24 hours cache
            headers: {
                'Origin': SITE_URL || 'https://fresherflow.com'
            }
        });
        if (!res.ok) return null;
        return await res.json() as string[];
    } catch (err) {
        console.warn('Failed to fetch skills metadata from CDN:', err);
        return null;
    }
}
