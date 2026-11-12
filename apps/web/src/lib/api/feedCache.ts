import { SITE_URL } from '@/lib/utils/runtimeConfig';

/**
 * A production build prerenders every page from one machine, so a feed source
 * that is down fails identically a few hundred times — one `fetch failed` line
 * per page per worker — and the one fact that matters is buried in the noise:
 *
 *   FEED_SOURCE=db points at http://localhost:5000 and nothing is listening.
 *
 * During a build, log each distinct failure once instead of once per page.
 * Runtime is deliberately unchanged: there an outage has to keep logging every
 * occurrence, because the operator has no other signal.
 */
const SUPPRESS_REPEATED_FEED_FAILURES = process.env.NEXT_PHASE === 'phase-production-build';
const FEED_FAILURES_LOGGED = new Set<string>();

function logFeedFailure(label: string, err: unknown): void {
    if (SUPPRESS_REPEATED_FEED_FAILURES && FEED_FAILURES_LOGGED.has(label)) return;
    FEED_FAILURES_LOGGED.add(label);
    console.warn(label, err instanceof Error ? err.message : err);
}

function cancelResponseBody(res: Response | null | undefined): void {
    if (!res) return;
    try {
        if (res.body) {
            void res.body.cancel().catch(() => {});
        } else {
            void res.arrayBuffer().catch(() => {});
        }
    } catch {
        // ignore stream cleanup error
    }
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
type CDNFetchOptions = RequestInit & {
    next?: {
        revalidate?: false | number;
        tags?: string[];
    };
};

function getCDNFetchOptions(options: CDNFetchOptions = {}): CDNFetchOptions {
    const headers = new Headers(options.headers || {});
    headers.set('Origin', SITE_URL);
    return {
        ...options,
        headers,
    };
}

/**
 * Feed cache policy for `next.revalidate`.
 *
 * Feed reads carry NO timer. Freshness is event-driven: the API rebuilds the
 * CDN snapshot, then calls the web's /api/revalidate, which marks the feed
 * tags stale. The next request to a page re-reads the new feed version and
 * regenerates that page once. A worker sweep re-sends the same tags if a call
 * was ever lost, so a missed webhook costs minutes, not days.
 *
 * A numeric bound here is NOT a small cache tweak. Next takes the LOWEST
 * revalidate found on a route as the route's ISR period (see `patch-fetch`:
 * the store keeps the minimum, and the collected value becomes the page's
 * revalidate), so one `revalidate: 60` on this fetch puts every page that
 * reads it on a 60-second timer. Each tick is a full render, and these
 * renders are expensive (feed index, companies metadata, an opportunity
 * shard, Firebase). That is the machine that exhausted the Vercel plan.
 *
 * - CDN mode: `false`. The URL is version-addressed AND the read is tagged,
 *   so the tag bust is the invalidation. An unbounded read used to pin /jobs
 *   to a two-job snapshot for eight days — but the cause was that the version
 *   manifest was cached UNTRACKED, so no tag could reach it. It is tracked
 *   now; that was the fix, not the timer.
 * - DB mode: also `false`. Public listing pages use event-driven invalidation;
 *   a numeric value here would turn every dependent page into a timed render.
 */
/**
 * No timer on the version manifest either.
 *
 * This read is the one thing that is NOT version-addressed, so it is the read
 * a stale site depends on. The tag is what makes that safe: /api/revalidate
 * sends `feed-version`, the entry is marked stale, and the next render reads
 * the live manifest and derives new signed URLs. Untracked (the old
 * `cache: 'force-cache'` without a tag) is the failure mode that pinned the
 * site to one snapshot for eight days.
 */
const FEED_VERSION_REVALIDATE_SECONDS: false | number = false;

/**
 * How long a feed body may be served from the Next Data Cache in CDN mode.
 *
 * `false`: the body is version-addressed and tagged. A rebuild changes the
 * URL, and the tag makes the old entry reachable. A timer here would add no
 * freshness and would re-render every page that reads the feed, every tick.
 */
function feedRevalidate(): false | number {
    return false;
}

export {
    cancelResponseBody,
    logFeedFailure,
    getCDNTimeout,
    getCDNFetchOptions,
    type CDNFetchOptions,
    FEED_VERSION_REVALIDATE_SECONDS,
    feedRevalidate,
};
