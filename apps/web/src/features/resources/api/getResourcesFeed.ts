import { ResourcesFeed } from "@fresherflow/types";
import { CDN_URL } from '@/lib/utils/runtimeConfig';

const RESOURCES_FEED_URL = process.env.NEXT_PUBLIC_CDN_URL 
    ? `${process.env.NEXT_PUBLIC_CDN_URL}/resources-feed.json`
    : `${CDN_URL}/resources-feed.json`;

export async function getResourcesFeed(): Promise<ResourcesFeed> {
    const response = await fetch(RESOURCES_FEED_URL, {
        next: { revalidate: 600 } // 10 minutes cache
    });

    if (!response.ok) {
        throw new Error("Failed to fetch resources feed");
    }

    return response.json();
}
