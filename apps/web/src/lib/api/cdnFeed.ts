import { cache } from 'react';
import { Opportunity } from '@fresherflow/types';
import { 
    BOOTSTRAP_FEED_URL, 
    FEED_INDEX_URL,
    EXPIRED_FEED_URL,
    FEED_VERSION_URL,
    GET_CATEGORY_SHARD_URL, 
    GET_COMPANY_SHARD_URL,
    SITE_URL, 
    EDUCATION_METADATA_URL, 
    SKILLS_METADATA_URL,
    COMPANIES_METADATA_URL,
    COMPANY_SLUG_HISTORY_URL,
    SITEMAP_DATA_URL,
    API_URL,
    GOVERNMENT_FEED_URL,
    CDN_URL,
    IS_LOCAL_FEED,
    IS_DB_FEED,
    FEED_CDN_BASE
} from '@/lib/utils/runtimeConfig';
import { readFeedCache } from '@/lib/cache/opportunitiesFeedCache';
export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

type FeedVersion = {
    version: string;
    stable: boolean;
};

let clientVersionCache: FeedVersion | null = null;
let clientBootstrapCache: BootstrapFeedResponse | null = null;


type CDNFetchOptions = RequestInit & {
    next?: {
        revalidate?: false | number;
        tags?: string[];
    };
};

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
    // FEED_SOURCE=db reads the API directly; it is not signature-gated.
    if (IS_DB_FEED) return url;

    const secret = process.env.CDN_SIGNATURE_SECRET || process.env.NEXT_PUBLIC_CDN_SIGNATURE_SECRET || process.env.EXPO_PUBLIC_CDN_SIGNATURE_SECRET;
    try {
        const parsedUrl = new URL(url, CDN_URL);
        parsedUrl.searchParams.set('v', version);
        if (!secret) return parsedUrl.toString();

        const pathname = parsedUrl.pathname;
        const message = `${pathname}:${version}`;
        const sig = await signMessage(message, secret);
        parsedUrl.searchParams.set('sig', sig);
        return parsedUrl.toString();
    } catch (err) {
        console.error('Failed to sign CDN url with version:', err);
        return url;
    }
}


export async function signProtectedCdnUrl(urlOrPath: string): Promise<string> {
    const secret = process.env.NEXT_PUBLIC_CDN_SIGNATURE_SECRET || process.env.EXPO_PUBLIC_CDN_SIGNATURE_SECRET || process.env.CDN_SIGNATURE_SECRET;
    if (!secret) return urlOrPath;
    try {
        const parsedUrl = new URL(urlOrPath, CDN_URL);
        const pathname = parsedUrl.pathname;
        const t = Math.floor(Date.now() / 1000 / 120) * 120;
        const message = `${pathname}:${t}`;
        const sig = await signMessage(message, secret);
        parsedUrl.searchParams.set('t', t.toString());
        parsedUrl.searchParams.set('sig', sig);
        return parsedUrl.toString();
    } catch {
        return urlOrPath;
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
function getCDNFetchOptions(options: CDNFetchOptions = {}): CDNFetchOptions {
    const headers = new Headers(options.headers || {});
    headers.set('Origin', SITE_URL );
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
 * - DB mode: still env-tuned (DB_FEED_REVALIDATE_SECONDS, default 60), because
 *   a db-mode deploy has no feed-version event to listen to. Set it to
 *   `false`/`0` to make db mode event-driven as well.
 */
function readDbFeedRevalidate(): false | number {
    const raw = (process.env.DB_FEED_REVALIDATE_SECONDS || '').trim().toLowerCase();
    // `false` or `0` means "no timer": db mode then behaves exactly like a
    // deliberately unbounded CDN mode, where a snapshot changes only when the
    // publish flow busts its tag.
    // Unset keeps the documented 60s default, so an existing db-mode deploy
    // does not silently change behaviour.
    if (raw === 'false' || raw === '0') return false;
    return Number(raw) || 60;
}
const DB_FEED_REVALIDATE_SECONDS = readDbFeedRevalidate();

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
const CDN_FEED_REVALIDATE_SECONDS: false | number = false;

function feedRevalidate(): false | number {
    return IS_DB_FEED ? DB_FEED_REVALIDATE_SECONDS : CDN_FEED_REVALIDATE_SECONDS;
}

/**
 * Fetches the centrally stored R2 feed version through Next's tagged cache.
 *
 * ALWAYS tracked, never timed. Untracked is the failure: the version is the
 * cache buster for every other CDN artifact, so an untracked read pins the
 * whole site to one snapshot — the signed URLs keep the same `?v=`, the CDN
 * keeps serving the same bytes, and no tag can reach the entries.
 *
 * The tag is what re-reads it: /api/revalidate sends `feed-version`, and the
 * next render reads the live manifest (uploaded `no-store`) and derives new
 * URLs. No timer is involved or wanted.
 */
const _fetchFeedVersion = async (): Promise<FeedVersion> => {
    // FEED_SOURCE=db reads the API (Postgres) directly: there is no CDN
    // version to resolve, so skip the network round-trip entirely.
    if (IS_DB_FEED) {
        return { version: 'db', stable: true };
    }

    const IS_CLIENT = typeof window !== 'undefined';
    if (IS_CLIENT) {
        if (clientVersionCache) {
            return clientVersionCache;
        }
        const fallbackObj = { version: 'fallback', stable: false };
        clientVersionCache = fallbackObj;
        return fallbackObj;
    }

    try {
        const res = await fetch(FEED_VERSION_URL, {
            next: { revalidate: FEED_VERSION_REVALIDATE_SECONDS, tags: ['feed-version'] },
        });
        if (res.ok) {
            const data = await res.json() as { version?: string };
            if (data?.version) {
                const versionObj = { version: data.version, stable: true };
                return versionObj;
            }
        }
        cancelResponseBody(res);
    } catch (err) {
        logFeedFailure('Failed to fetch feed version, using uncached fallback:', err);
    }

    return { version: 'fallback', stable: false };
};
export const fetchFeedVersion = cache(_fetchFeedVersion);

// Browser-side session cache for the post-paint feed hydration (below).
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

/**
 * Fetches the static bootstrap feed from the CDN (or local API fallback in development).
 * Used for "Zero-Spinner" instant discovery and SEO.
 *
 * Always tagged, never timed — see the feed cache policy above. A caller can
 * still ask for a live read (`forceLive`), which is the admin-only escape
 * hatch.
 */
const _fetchBootstrapFeed = async (forceLive = false, customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    const IS_CLIENT = typeof window !== 'undefined';
    const IS_SERVER = typeof window === 'undefined';

    if (IS_CLIENT) {
        if (clientBootstrapCache && !forceLive) {
            return clientBootstrapCache;
        }
        const cached = readFeedCache();
        if (cached && Array.isArray(cached.opportunities) && cached.opportunities.length > 0) {
            const result: BootstrapFeedResponse = {
                opportunities: cached.opportunities,
                count: cached.count || cached.opportunities.length,
                generatedAt: new Date(cached.cachedAt || Date.now()).toISOString(),
            };
            clientBootstrapCache = result;
            return result;
        }
        return clientBootstrapCache || null;
    }

    try {
        const feedVersion = await fetchFeedVersion();
        const rawUrl = BOOTSTRAP_FEED_URL;
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(rawUrl, feedVersion.version)
            : `${rawUrl}?v=${feedVersion.version}`;

        const controller = new AbortController();
        // 10s timeout — a cache hit should respond in <100ms; this guards only cold misses
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let res = await fetch(signedUrl, getCDNFetchOptions({
            cache: forceLive ? 'no-store' : 'force-cache',
            ...(!forceLive ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['homepage-feed'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        // Fallback if CDN fetch fails in development mode (e.g. 403 due to missing local signature secret)
        if (!res.ok && process.env.NODE_ENV === 'development') {
            cancelResponseBody(res);
            try {
                // First try live API for live data in local development
                const liveApiRes = await fetch('https://api.fresherflow.in/bootstrap-feed.min.json', { cache: 'no-store' });
                if (liveApiRes.ok) {
                    const liveData = await liveApiRes.json();
                    if (liveData && Array.isArray(liveData.opportunities) && liveData.opportunities.length > 0) {
                        const result = liveData as BootstrapFeedResponse;
                        if (IS_CLIENT) {
                            clientBootstrapCache = result;
                        }
                        return result;
                    }
                } else {
                    cancelResponseBody(liveApiRes);
                }
                // Then fall back to local API
                const localApiUrl = `${API_URL}/bootstrap-feed.min.json`;
                const localRes = await fetch(localApiUrl, { cache: 'no-store' });
                if (localRes.ok) {
                    res = localRes;
                } else {
                    cancelResponseBody(localRes);
                }
            } catch {
                // Ignore fallback error
            }
        }

        if (!res.ok) {
            cancelResponseBody(res);
            if (IS_SERVER) {
                console.error(`Failed to fetch bootstrap feed: ${res.status} ${res.statusText}`);
            }
            return null;
        }

        const data = await res.json() as BootstrapFeedResponse;
        
        // Basic validation
        if (!data || !Array.isArray(data.opportunities)) {
            if (IS_SERVER) {
                console.error('Invalid bootstrap feed format');
            }
            return null;
        }

        if (IS_CLIENT) {
            clientBootstrapCache = data;
        }
        return data;
    } catch (err) {
        // Fallback to local Express API server in development mode if network fetch threw an exception
        if (process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/bootstrap-feed.min.json`;
                const localRes = await fetch(localApiUrl, { cache: 'no-store' });
                if (localRes.ok) {
                    const data = await localRes.json() as BootstrapFeedResponse;
                    if (data && Array.isArray(data.opportunities)) {
                        if (IS_CLIENT) {
                            clientBootstrapCache = data;
                        }
                        return data;
                    }
                } else {
                    cancelResponseBody(localRes);
                }
            } catch {
                // Ignore fallback error
            }
        }
        if (IS_SERVER) {
            logFeedFailure('Bootstrap CDN fetch failed:', err);
        }
        return null;
    }
};
export const fetchBootstrapFeed = cache(_fetchBootstrapFeed);

/**
 * Fetches the lightweight feed index from CDN.
 * Contains only card-rendering fields (~700 bytes/job vs ~2.5KB in full bootstrap).
 * Falls back to the full bootstrap feed if the index is unavailable.
 *
 * Always tagged, never timed. The `feed-index` tag is what /api/revalidate
 * busts after a regeneration; the worker sweep re-sends it if that call was
 * lost. There is deliberately no TTL: a TTL here becomes the ISR period of
 * every list page.
 */
const _fetchFeedIndex = async (forceLive = false, customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    if (typeof window !== 'undefined') {
        if (clientBootstrapCache && !forceLive) {
            return clientBootstrapCache;
        }
        const cached = readFeedCache();
        if (cached && Array.isArray(cached.opportunities) && cached.opportunities.length > 0) {
            const result: BootstrapFeedResponse = {
                opportunities: cached.opportunities,
                count: cached.count || cached.opportunities.length,
                generatedAt: new Date(cached.cachedAt || Date.now()).toISOString(),
            };
            clientBootstrapCache = result;
            return result;
        }
        return clientBootstrapCache || null;
    }

    try {
        const feedVersion = await fetchFeedVersion();
        const rawUrl = FEED_INDEX_URL;
        const signedUrl = await signUrlWithVersion(rawUrl, feedVersion.version);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let res = await fetch(signedUrl, getCDNFetchOptions({
            cache: forceLive ? 'no-store' : 'force-cache',
            ...(!forceLive ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['feed-index'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            cancelResponseBody(res);
            console.warn(`Feed index returned ${res.status}, falling back to bootstrap feed`);
            return _fetchBootstrapFeed(forceLive, customTags);
        }

        const data = await res.json() as BootstrapFeedResponse;
        if (!data || !Array.isArray(data.opportunities)) {
            return _fetchBootstrapFeed(forceLive, customTags);
        }

        return data;
    } catch (err) {
        logFeedFailure('Feed index fetch failed, falling back to bootstrap:', err);
        return _fetchBootstrapFeed(forceLive, customTags);
    }
};
export const fetchFeedIndex = cache(_fetchFeedIndex);

/**
 * Fetches the static expired feed from the CDN.
 * Used as a fallback by detail pages to prevent 404s for recently expired opportunities.
 *
 * Tracked, not timed: an expired listing is exactly the kind of thing a
 * publish/expire event moves, and the detail pages that read this must not
 * keep serving a snapshot from before the expiry — the `expired-feed` tag is
 * what moves them.
 */
const _fetchExpiredFeed = async (customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        // CDN mode has no local expired snapshot in dev. FEED_SOURCE=db reads
        // the API (Postgres), which does serve it, so let db mode through.
        if (process.env.NODE_ENV === 'development' && !IS_DB_FEED) {
            return null;
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
            ...(feedVersion.stable ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['expired-feed'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            cancelResponseBody(res);
            console.error(`Failed to fetch expired feed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json() as BootstrapFeedResponse;
        
        if (!data || !Array.isArray(data.opportunities)) {
            return null;
        }

        return data;
    } catch (err) {
        logFeedFailure('Expired CDN fetch failed:', err);
        return null;
    }
};
export const fetchExpiredFeed = cache(_fetchExpiredFeed);

/**
 * Fetches the static government jobs feed from the CDN.
 *
 * Tracked, not timed, for the same reason as the main index: government
 * notices are published through the same flow, and the `government-feed` tag
 * is what puts a newly published notice on /govt.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _fetchGovernmentFeed = async (_forceLive = false, customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(GOVERNMENT_FEED_URL, feedVersion.version)
            : `${GOVERNMENT_FEED_URL}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let res = await fetch(signedUrl, getCDNFetchOptions({
            cache: feedVersion.stable ? 'force-cache' : 'no-store',
            ...(feedVersion.stable ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['government-feed'] } } : {}),
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        // Fallback if CDN fetch fails in development mode (e.g. 403 due to missing local signature secret)
        if (!res.ok && process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/government-feed.json`;
                const localRes = await fetch(localApiUrl, { cache: 'no-store' });
                if (localRes.ok) {
                    res = localRes;
                } else {
                    cancelResponseBody(localRes);
                }
            } catch {}
        }

        if (!res.ok) {
            cancelResponseBody(res);
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
        if (process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/government-feed.json`;
                const localRes = await fetch(localApiUrl, { cache: 'no-store' });
                if (localRes.ok) {
                    const data = await localRes.json() as BootstrapFeedResponse;
                    if (data && Array.isArray(data.opportunities)) {
                        return data;
                    }
                } else {
                    cancelResponseBody(localRes);
                }
            } catch {
                // Ignore fallback error
            }
        }
        logFeedFailure('Government CDN fetch failed:', err);
        return null;
    }
};
export const fetchGovernmentFeed = cache(_fetchGovernmentFeed);

/**
 * Fetches an individual opportunity JSON directly from R2/CDN edge.
 * Used by job detail pages (/jobs/[slug]) for ultra-fast, ~2.5KB payload loads.
 *
 * The shard is version-addressed like every other artifact, so it does not need
 * a timer of its own — a new feed version produces a new URL. It DOES need a
 * tag: /api/revalidate busts `opportunity-<slug>` when a listing is published
 * or expires, and an entry written without a tag can never be reached.
 */
const _fetchOpportunityDetail = async (idOrSlug: string, customTags?: string[]): Promise<Opportunity | null> => {
    if (!idOrSlug) return null;
    try {
        const feedVersion = await fetchFeedVersion();

        let targetId = idOrSlug;
        let resolvedSlug: string | null = null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        if (!isUuid) {
            // Quick in-memory check against lightweight feed index (~20KB) to resolve slug -> id
            const index = await fetchFeedIndex();
            const matched = index?.opportunities?.find(o => o.slug === idOrSlug || o.id === idOrSlug);
            if (matched?.id) {
                targetId = matched.id;
                resolvedSlug = matched.slug || null;
            }
        }

        // /api/revalidate derives `opportunity-<slug>` from the published path,
        // so the shard entry has to carry the same name to be reachable. The
        // requested id is kept as well: a request that came in by UUID still
        // busts under the name the caller used.
        const tags = customTags ?? [
            `opportunity-${idOrSlug}`,
            ...(resolvedSlug && resolvedSlug !== idOrSlug ? [`opportunity-${resolvedSlug}`] : []),
        ];

        const rawUrl = `${FEED_CDN_BASE}/jobs/${encodeURIComponent(targetId)}.json`;
        const signedUrl = typeof window === 'undefined'
            ? await signUrlWithVersion(rawUrl, feedVersion.version)
            : `${rawUrl}?v=${feedVersion.version}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(signedUrl, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags },
            signal: controller.signal,
        }));
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json() as Opportunity;
            if (data && (data.id || data.title)) {
                return data;
            }
        }
        cancelResponseBody(res);
    } catch {
        // Fallback to bootstrap feed search in caller
    }
    return null;
};
export const fetchOpportunityDetail = cache(_fetchOpportunityDetail);

/**
 * Fetches a specific category shard (e.g. trending, remote, 2026)
 *
 * Version-addressed, so no timer of its own — but always tagged, so a
 * regeneration can reach it.
 */
const _fetchCategoryShard = async (id: string, customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
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
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        const data = await res.json() as BootstrapFeedResponse;

        return data;
    } catch (err) {
        logFeedFailure(`Failed to fetch shard ${id}:`, err);
        return null;
    }
};
export const fetchCategoryShard = cache(_fetchCategoryShard);

/**
 * Fetches a specific company shard (e.g. google, microsoft)
 *
 * Version-addressed, so no timer of its own — but always tagged, so a
 * regeneration (or a publish that names the company) can reach it.
 */
const _fetchCompanyShard = async (slug: string, customTags?: string[]): Promise<BootstrapFeedResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
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
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        const data = await res.json() as BootstrapFeedResponse;

        return data;
    } catch (err) {
        logFeedFailure(`Failed to fetch company shard ${slug}:`, err);
        return null;
    }
};
export const fetchCompanyShard = cache(_fetchCompanyShard);

export interface EducationMetadata {
    educationLevels: string[];
    courses: Record<string, string[]>;
    specializations: Record<string, string[]>;
}

/**
 * Stably signs a CDN URL with the current feed version so edge/server caches hit 99.9%+
 * without rotating every 2 minutes.
 */
async function signStableUrl(rawUrl: string): Promise<string> {
    const feedVersion = await fetchFeedVersion();
    const IS_SERVER = typeof window === 'undefined';
    return IS_SERVER
        ? await signUrlWithVersion(rawUrl, feedVersion.version)
        : `${rawUrl}?v=${feedVersion.version}`;
}

/**
 * Fetches education metadata from CDN through Next's tagged cache.
 */
const _fetchEducationMetadata = async (): Promise<EducationMetadata | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(EDUCATION_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['education-metadata'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return await res.json() as EducationMetadata;
    } catch (err) {
        logFeedFailure('Failed to fetch education metadata from CDN:', err);
        return null;
    }
};
export const fetchEducationMetadata = cache(_fetchEducationMetadata);

/**
 * Fetches skills list from CDN through Next's tagged cache.
 */
const _fetchSkillsMetadata = async (): Promise<string[] | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(SKILLS_METADATA_URL);
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['skills-metadata'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return await res.json() as string[];
    } catch (err) {
        logFeedFailure('Failed to fetch skills metadata from CDN:', err);
        return null;
    }
};
export const fetchSkillsMetadata = cache(_fetchSkillsMetadata);

export interface CompanyMetadata {
    name: string;
    slug?: string;
    url?: string | null;
    logo_url?: string | null;
}

/**
 * Fetches companies list from CDN.
 *
 * Version-addressed metadata: no timer of its own, but always tagged so a
 * regeneration can reach it.
 */
const _fetchCompaniesMetadata = async (): Promise<CompanyMetadata[] | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(COMPANIES_METADATA_URL);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getCDNTimeout());
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['companies-metadata'] },
            signal: controller.signal,
        }));
        clearTimeout(timeoutId);
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return await res.json() as CompanyMetadata[];
    } catch (err) {
        logFeedFailure('Failed to fetch companies metadata from CDN:', err);
        return null;
    }
};
export const fetchCompaniesMetadata = cache(_fetchCompaniesMetadata);

export interface CompanySlugHistory {
    generatedAt?: number;
    /** retired slug -> the slug that replaced it */
    aliases: Record<string, string>;
    /** every slug that has ever had a live job */
    everLive: Set<string>;
}

const EMPTY_SLUG_HISTORY: CompanySlugHistory = { aliases: {}, everLive: new Set() };

/**
 * Fetches the durable company slug history from the CDN.
 *
 * Never throws and never rejects: a company page that cannot reach this file
 * must still render, because falling back to "unknown" is what turns a CDN blip
 * into a 404 for a page Google has already crawled.
 */
const _fetchCompanySlugHistory = async (): Promise<CompanySlugHistory> => {
    if (typeof window !== 'undefined') {
        return EMPTY_SLUG_HISTORY;
    }
    try {
        const url = await signStableUrl(COMPANY_SLUG_HISTORY_URL);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getCDNTimeout());
        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['company-slug-history'] },
            signal: controller.signal,
        }));
        clearTimeout(timeoutId);
        if (!res.ok) {
            cancelResponseBody(res);
            return EMPTY_SLUG_HISTORY;
        }
        const data = await res.json() as { generatedAt?: number; aliases?: Record<string, string>; everLive?: string[] };
        const aliases: Record<string, string> = {};
        for (const [from, to] of Object.entries(data?.aliases || {})) {
            if (typeof from === 'string' && from && typeof to === 'string' && to && from !== to) {
                aliases[from] = to;
            }
        }
        const everLive = new Set<string>(
            (Array.isArray(data?.everLive) ? data.everLive : []).filter(s => typeof s === 'string' && s)
        );
        return { generatedAt: data?.generatedAt, aliases, everLive };
    } catch (err) {
        logFeedFailure('Failed to fetch company slug history from CDN:', err);
        return EMPTY_SLUG_HISTORY;
    }
};
export const fetchCompanySlugHistory = cache(_fetchCompanySlugHistory);

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
const _fetchSitemapData = async (): Promise<SitemapDataResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(SITEMAP_DATA_URL);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['sitemap-data'] },
            signal: controller.signal,
        }));

        clearTimeout(timeoutId);

        if (!res.ok) {
            cancelResponseBody(res);
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
        logFeedFailure('Sitemap CDN fetch failed:', err);
        return null;
    }
};
export const fetchSitemapData = cache(_fetchSitemapData);
