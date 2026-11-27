import { cache } from 'react';
import { Opportunity } from '@fresherflow/types';
import {
    BOOTSTRAP_FEED_URL,
    FEED_INDEX_URL,
    EXPIRED_FEED_URL,
    FEED_VERSION_URL,
    GET_CATEGORY_SHARD_URL,
    GET_COMPANY_SHARD_URL,
    EDUCATION_METADATA_URL,
    SKILLS_METADATA_URL,
    COMPANIES_METADATA_URL,
    COMPANY_SLUG_HISTORY_URL,
    SITEMAP_DATA_URL,
    API_URL,
    GOVERNMENT_FEED_URL,
    IS_DB_FEED,
    FEED_CDN_BASE,
} from '@/lib/utils/runtimeConfig';
import { cancelResponseBody, logFeedFailure, getCDNTimeout, getCDNFetchOptions, type CDNFetchOptions, FEED_VERSION_REVALIDATE_SECONDS, feedRevalidate } from './feedCache';
import { clientFeedState } from './feedClient';
import { signUrlWithVersion } from './cdnSigning';
import { readFeedCache } from '@/lib/cache/opportunitiesFeedCache';

const MAX_FEED_RESPONSE_BYTES = 32 * 1024 * 1024;

/**
 * Server-side memo of parsed feed payloads, keyed by the fully signed CDN URL.
 *
 * Every feed URL carries `?v=<feed-version>` (see signUrlWithVersion), so its
 * bytes are immutable until the next publish changes the version. Parsing a
 * 422 KB index or 1.1 MB bootstrap on every request is the dominant Vercel
 * Fluid Active CPU cost — React cache() only dedups within one request, not
 * across them. Reuse the parsed object for the life of the isolate instead.
 *
 * The version manifest itself has no `?v=` and is never memoised, so a publish
 * always derives fresh signed URLs and a cache miss on the new version.
 * `forceLive` (no-store) reads bypass the memo entirely.
 */
const MAX_PARSED_FEED_ENTRIES = 24;
const parsedFeedMemo = new Map<string, unknown>();

function memoKeyForFeed(url: string, options: CDNFetchOptions): string | null {
    if (typeof window !== 'undefined') return null; // client has its own caches
    if (options.cache === 'no-store') return null; // admin live reads must bypass
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    // Only version-pinned CDN artifacts are immutable. This excludes the
    // version manifest and unversioned dev/API URLs.
    return parsed.searchParams.has('v') ? url : null;
}

/** Parse a feed response with a hard byte ceiling before materialising JSON. */
async function parseBoundedJson<T>(response: Response): Promise<T> {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_FEED_RESPONSE_BYTES) {
        await response.body?.cancel();
        throw new Error('Feed response exceeded the configured size limit');
    }

    if (!response.body) throw new Error('Feed response has no body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let totalBytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > MAX_FEED_RESPONSE_BYTES) {
                await reader.cancel();
                throw new Error('Feed response exceeded the configured size limit');
            }
            chunks.push(decoder.decode(value, { stream: true }));
        }
    } finally {
        reader.releaseLock();
    }

    chunks.push(decoder.decode());
    return JSON.parse(chunks.join('')) as T;
}

/** Keep the timeout active until both response headers and body are consumed. */
async function fetchFeedJson<T>(
    url: string,
    options: CDNFetchOptions,
    timeoutMs = getCDNTimeout(),
): Promise<{ response: Response; data: T | null }> {
    const memoKey = memoKeyForFeed(url, options);
    if (memoKey) {
        const cached = parsedFeedMemo.get(memoKey);
        if (cached !== undefined) {
            // A synthetic OK response keeps the existing callers' `res.ok`
            // checks working without re-fetching or re-parsing a body.
            return { response: new Response(null, { status: 200 }), data: cached as T };
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) return { response, data: null };
        const data = await parseBoundedJson<T>(response);
        if (memoKey) {
            // Bounded FIFO: evict the oldest entry when full. A publish changes
            // the version and produces new keys, so old entries are harmless.
            if (parsedFeedMemo.size >= MAX_PARSED_FEED_ENTRIES) {
                const oldest = parsedFeedMemo.keys().next().value;
                if (oldest !== undefined) parsedFeedMemo.delete(oldest);
            }
            parsedFeedMemo.set(memoKey, data);
        }
        return { response, data };
    } finally {
        clearTimeout(timeoutId);
    }
}

export interface BootstrapFeedResponse {
    opportunities: Opportunity[];
    count: number;
    generatedAt: string;
}

export type FeedVersion = {
    version: string;
    stable: boolean;
};

export interface EducationMetadata {
    educationLevels: string[];
    courses: Record<string, string[]>;
    specializations: Record<string, string[]>;
}

export interface CompanyMetadata {
    name: string;
    slug?: string;
    url?: string | null;
    logo_url?: string | null;
}

export interface CompanySlugHistory {
    generatedAt?: number;
    /** retired slug -> the slug that replaced it */
    aliases: Record<string, string>;
    /** every slug that has ever had a live job */
    everLive: Set<string>;
}

const EMPTY_SLUG_HISTORY: CompanySlugHistory = { aliases: {}, everLive: new Set() };

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
        if (clientFeedState.version) {
            return clientFeedState.version;
        }
        const fallbackObj = { version: 'fallback', stable: false };
        clientFeedState.version = fallbackObj;
        return fallbackObj;
    }

    try {
        const { response: res, data } = await fetchFeedJson<{ version?: string }>(FEED_VERSION_URL, getCDNFetchOptions({
            next: { revalidate: FEED_VERSION_REVALIDATE_SECONDS, tags: ['feed-version'] },
        }));
        if (res.ok) {
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
        if (clientFeedState.bootstrap && !forceLive) {
            return clientFeedState.bootstrap;
        }
        const cached = readFeedCache();
        if (cached && Array.isArray(cached.opportunities) && cached.opportunities.length > 0) {
            const result: BootstrapFeedResponse = {
                opportunities: cached.opportunities,
                count: cached.count || cached.opportunities.length,
                generatedAt: new Date(cached.cachedAt || Date.now()).toISOString(),
            };
            clientFeedState.bootstrap = result;
            return result;
        }
        return clientFeedState.bootstrap || null;
    }

    try {
        const feedVersion = await fetchFeedVersion();
        const rawUrl = BOOTSTRAP_FEED_URL;
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(rawUrl, feedVersion.version)
            : `${rawUrl}?v=${feedVersion.version}`;

        // 10s timeout — a cache hit should respond in <100ms; this guards only cold misses
        let { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(signedUrl, getCDNFetchOptions({
            cache: forceLive ? 'no-store' : 'force-cache',
            ...(!forceLive ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['homepage-feed'] } } : {}),
        }), 10_000);

        // Fallback if CDN fetch fails in development mode (e.g. 403 due to missing local signature secret)
        if (!res.ok && process.env.NODE_ENV === 'development') {
            cancelResponseBody(res);
            try {
                // Fall back to the configured API. This used to hardcode
                // https://api.fresherflow.in/bootstrap-feed.min.json, which
                // meant a local dev box silently rendered production data and
                // used a path the Express app does not mount (/feeds/... is
                // the real one). Never bake a host into a dev fallback.
                const localApiUrl = `${API_URL}/feeds/bootstrap-feed.min.json`;
                const local = await fetchFeedJson<BootstrapFeedResponse>(localApiUrl, { cache: 'no-store' }, 10_000);
                if (local.response.ok) {
                    res = local.response;
                    data = local.data;
                } else {
                    cancelResponseBody(local.response);
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

        // Basic validation
        if (!data || !Array.isArray(data.opportunities)) {
            if (IS_SERVER) {
                console.error('Invalid bootstrap feed format');
            }
            return null;
        }

        if (IS_CLIENT) {
            clientFeedState.bootstrap = data;
        }
        return data;
    } catch (err) {
        // Fallback to local Express API server in development mode if network fetch threw an exception
        if (process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/feeds/bootstrap-feed.min.json`;
                const local = await fetchFeedJson<BootstrapFeedResponse>(localApiUrl, { cache: 'no-store' }, 10_000);
                if (local.response.ok) {
                    const data = local.data;
                    if (data && Array.isArray(data.opportunities)) {
                        if (IS_CLIENT) {
                            clientFeedState.bootstrap = data;
                        }
                        return data;
                    }
                } else {
                    cancelResponseBody(local.response);
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
        if (clientFeedState.bootstrap && !forceLive) {
            return clientFeedState.bootstrap;
        }
        const cached = readFeedCache();
        if (cached && Array.isArray(cached.opportunities) && cached.opportunities.length > 0) {
            const result: BootstrapFeedResponse = {
                opportunities: cached.opportunities,
                count: cached.count || cached.opportunities.length,
                generatedAt: new Date(cached.cachedAt || Date.now()).toISOString(),
            };
            clientFeedState.bootstrap = result;
            return result;
        }
        return clientFeedState.bootstrap || null;
    }

    try {
        const feedVersion = await fetchFeedVersion();
        const rawUrl = FEED_INDEX_URL;
        const signedUrl = await signUrlWithVersion(rawUrl, feedVersion.version);

        const { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(signedUrl, getCDNFetchOptions({
            cache: forceLive ? 'no-store' : 'force-cache',
            ...(!forceLive ? { next: { revalidate: feedRevalidate(), tags: customTags ?? ['feed-index'] } } : {}),
        }), 10_000);

        if (!res.ok) {
            cancelResponseBody(res);
            console.warn(`Feed index returned ${res.status}`);
            return null;
        }

        if (!data || !Array.isArray(data.opportunities)) {
            console.warn('Feed index returned invalid data');
            return null;
        }

        return data;
    } catch (err) {
        logFeedFailure('Feed index fetch failed:', err);
        return null;
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
        // CDN mode has no expired snapshot in dev. FEED_SOURCE=db reads
        // the API (Postgres), which does serve it, so let db mode through.
        if (process.env.NODE_ENV === 'development' && !IS_DB_FEED) {
            return null;
        }

        const feedVersion = await fetchFeedVersion();

        const IS_SERVER = typeof window === 'undefined';
        const signedUrl = IS_SERVER
            ? await signUrlWithVersion(EXPIRED_FEED_URL, feedVersion.version)
            : `${EXPIRED_FEED_URL}?v=${feedVersion.version}`;

        // Always cached and tagged. A transient version-manifest blip used to
        // flip this to `no-store`, turning a high-traffic public page into a
        // per-request render — the failure mode that exhausts Fluid CPU. The
        // URL is version-addressed and the tag is what invalidates it.
        const { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(signedUrl, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: feedRevalidate(), tags: customTags ?? ['expired-feed'] },
        }), 10_000);

        if (!res.ok) {
            cancelResponseBody(res);
            console.error(`Failed to fetch expired feed: ${res.status} ${res.statusText}`);
            return null;
        }

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

        let { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(signedUrl, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: feedRevalidate(), tags: customTags ?? ['government-feed'] },
        }), 10_000);

        // Fallback if CDN fetch fails in development mode (e.g. 403 due to missing local signature secret)
        if (!res.ok && process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/feeds/government-feed.json`;
                const local = await fetchFeedJson<BootstrapFeedResponse>(localApiUrl, { cache: 'no-store' }, 10_000);
                if (local.response.ok) {
                    res = local.response;
                    data = local.data;
                } else {
                    cancelResponseBody(local.response);
                }
            } catch {}
        }

        if (!res.ok) {
            cancelResponseBody(res);
            console.error(`Failed to fetch government feed: ${res.status} ${res.statusText}`);
            return null;
        }

        if (!data || !Array.isArray(data.opportunities)) {
            console.error('Invalid government feed format');
            return null;
        }

        return data;
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            try {
                const localApiUrl = `${API_URL}/feeds/government-feed.json`;
                const local = await fetchFeedJson<BootstrapFeedResponse>(localApiUrl, { cache: 'no-store' }, 10_000);
                if (local.response.ok) {
                    const data = local.data;
                    if (data && Array.isArray(data.opportunities)) {
                        return data;
                    }
                } else {
                    cancelResponseBody(local.response);
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

        if (!isUuid && !IS_DB_FEED) {
            // CDN job shards are keyed by UUID; the DB API accepts slugs
            // directly, so that source avoids an index lookup per detail page.
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

        const { response: res, data } = await fetchFeedJson<Opportunity>(signedUrl, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags },
        }), 6_000);

        if (res.ok) {
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

        const { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: customTags ?? [`category-${id}`, 'category-shards'] },
        }), 3_500);
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
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

        const { response: res, data } = await fetchFeedJson<BootstrapFeedResponse>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: customTags ?? [`company-${slug}`, 'company-shards'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return data;
    } catch (err) {
        logFeedFailure(`Failed to fetch company shard ${slug}:`, err);
        return null;
    }
};
export const fetchCompanyShard = cache(_fetchCompanyShard);

/**
 * Fetches education metadata from CDN through Next's tagged cache.
 */
const _fetchEducationMetadata = async (): Promise<EducationMetadata | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(EDUCATION_METADATA_URL);
        const { response: res, data } = await fetchFeedJson<EducationMetadata>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['education-metadata'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return data;
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
        const { response: res, data } = await fetchFeedJson<string[]>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['skills-metadata'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return data;
    } catch (err) {
        logFeedFailure('Failed to fetch skills metadata from CDN:', err);
        return null;
    }
};
export const fetchSkillsMetadata = cache(_fetchSkillsMetadata);

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
        const { response: res, data } = await fetchFeedJson<CompanyMetadata[]>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['companies-metadata'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return null;
        }
        return data;
    } catch (err) {
        logFeedFailure('Failed to fetch companies metadata from CDN:', err);
        return null;
    }
};
export const fetchCompaniesMetadata = cache(_fetchCompaniesMetadata);

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
        const { response: res, data } = await fetchFeedJson<{ generatedAt?: number; aliases?: Record<string, string>; everLive?: string[] }>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['company-slug-history'] },
        }));
        if (!res.ok) {
            cancelResponseBody(res);
            return EMPTY_SLUG_HISTORY;
        }
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

/**
 * Fetches sitemap raw data (companies + up to 1000 opportunities) from the CDN.
 */
const _fetchSitemapData = async (): Promise<SitemapDataResponse | null> => {
    if (typeof window !== 'undefined') {
        return null;
    }
    try {
        const url = await signStableUrl(SITEMAP_DATA_URL);

        const { response: res, data } = await fetchFeedJson<SitemapDataResponse>(url, getCDNFetchOptions({
            cache: 'force-cache',
            next: { revalidate: false, tags: ['sitemap-data'] },
        }), 15_000);

        if (!res.ok) {
            cancelResponseBody(res);
            console.error(`Failed to fetch sitemap data: ${res.status} ${res.statusText}`);
            return null;
        }

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
