import { cache } from 'react';
import { ResourcesFeed } from "@fresherflow/types";
import { CDN_URL } from '@/lib/utils/runtimeConfig';

const RESOURCES_FEED_URL = process.env.NEXT_PUBLIC_CDN_URL 
    ? `${process.env.NEXT_PUBLIC_CDN_URL}/resources-feed.json`
    : `${CDN_URL}/resources-feed.json`;

// Safe empty feed so the page renders its honest empty state instead of
// crashing prerender when the CDN is unreachable (matches the landing page's
// resilience pattern).
const EMPTY_FEED: ResourcesFeed = {
    metadata: { version: 'unavailable', updatedAt: 0 },
    resources: [],
    companyMetadata: {},
};

const _getResourcesFeed = async (): Promise<ResourcesFeed> => {
    try {
        const response = await fetch(RESOURCES_FEED_URL, {
            next: { revalidate: 600 } // 10 minutes cache
        });

        if (!response.ok) {
            console.error(`Resources feed returned ${response.status}; rendering empty state`);
            return EMPTY_FEED;
        }

        return await response.json();
    } catch (err) {
        console.error('Resources feed fetch failed; rendering empty state:', err instanceof Error ? err.message : err);
        return EMPTY_FEED;
    }
};

export const getResourcesFeed = cache(_getResourcesFeed);
