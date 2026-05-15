import { Opportunity } from '@fresherflow/types';
import { BOOTSTRAP_FEED_URL } from '../runtimeConfig';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

/**
 * Fetches the static bootstrap feed from the CDN.
 * This is used for "Zero-Spinner" instant discovery and SEO.
 */
export async function fetchBootstrapFeed(): Promise<BootstrapFeedResponse | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(BOOTSTRAP_FEED_URL, {
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
