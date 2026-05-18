import { Opportunity } from '@fresherflow/types';
import { BOOTSTRAP_FEED_URL, GET_CATEGORY_SHARD_URL } from '../runtimeConfig';
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
        let url = BOOTSTRAP_FEED_URL;
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, {
            next: { revalidate: 3600 }, // Cache for 1 hour on the server
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
        console.warn('Bootstrap CDN unavailable, using bundled feed if present:', err instanceof Error ? err.message : err);
        try {
            const localPath = path.join(process.cwd(), 'public', 'bootstrap-feed.min.json');
            const local = await readFile(localPath, 'utf8');
            const data = JSON.parse(local) as BootstrapFeedResponse & { total?: number };
            return {
                opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
                count: typeof data.count === 'number' ? data.count : data.total ?? data.opportunities?.length ?? 0,
                generatedAt: data.generatedAt || new Date(0).toISOString(),
            };
        } catch (localErr) {
            console.error('Bundled bootstrap feed unavailable:', localErr instanceof Error ? localErr.message : localErr);
            return null;
        }
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
        });

        if (!res.ok) return null;
        return await res.json() as BootstrapFeedResponse;
    } catch (err) {
        console.warn(`Failed to fetch shard ${id}:`, err);
        return null;
    }
}
