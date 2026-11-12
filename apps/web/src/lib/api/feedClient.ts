import type { BootstrapFeedResponse, FeedVersion } from './feedServer';

/**
 * Browser-side session cache for the post-paint feed hydration.
 * One request per scope per session; later calls resolve from memory.
 *
 * The mutable state is held in a single exported object so that feedServer.ts
 * (which owns the server-side fetchers) can update it after a network read.
 * Direct `let` bindings cannot be reassigned from an importing module under ES
 * module live-binding rules.
 */
export const clientFeedState: {
    version: FeedVersion | null;
    bootstrap: BootstrapFeedResponse | null;
} = {
    version: null,
    bootstrap: null,
};

const clientFullFeedRequests = new Map<string, Promise<BootstrapFeedResponse | null>>();

/**
 * Browser-side loader for the remainder of a feed. Route components serialize
 * one page into the HTML (so view-source stays light); after paint the client
 * fetches the rest through the same-origin /api/public/feed proxy — the CDN
 * asset itself is signature-protected and sends no CORS headers to browsers.
 * One request per scope per session; later calls resolve from memory.
 * Never throws: resolves null when unavailable, so the page keeps its
 * server-rendered first page instead of failing.
 */
export function fetchFullFeedOnClient(scope: 'ALL' | 'GOVERNMENT' = 'ALL'): Promise<BootstrapFeedResponse | null> {
    const pending = clientFullFeedRequests.get(scope);
    if (pending) return pending;

    const request = (async () => {
        try {
            const res = await fetch(`/api/public/feed?type=${scope}`);
            if (!res.ok) {
                clientFullFeedRequests.delete(scope);
                return null;
            }

            const data = await res.json() as BootstrapFeedResponse;
            if (!data || !Array.isArray(data.opportunities) || data.opportunities.length === 0) {
                clientFullFeedRequests.delete(scope);
                return null;
            }
            return data;
        } catch (err) {
            console.warn('Client feed hydration failed:', err instanceof Error ? err.message : err);
            clientFullFeedRequests.delete(scope);
            return null;
        }
    })();

    clientFullFeedRequests.set(scope, request);
    return request;
}
