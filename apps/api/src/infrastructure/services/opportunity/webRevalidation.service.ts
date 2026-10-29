import { logger } from '@fresherflow/utils';

/**
 * Tell the web app that the discovery feeds on the CDN have moved.
 *
 * The hub pages (/, /jobs, /internships, /drives, /govt, /companies) read the
 * CDN JSON feed, and Next.js caches that read under a tag. Rebuilding the feed
 * on the CDN does NOT invalidate that cache: a tag bust only makes Next
 * re-read the SAME URL, so a listing that was published and never announced
 * stays invisible on the site until somebody presses "Refresh cache".
 *
 * This service is the announcement. It POSTs to the web app's `/api/revalidate`
 * route with the tag list the web caches the feeds under, which marks those
 * cache entries stale (no ISR write, no path list — see the ISR write safety
 * note in `routes/admin/system.ts`).
 *
 * Rules this service keeps:
 *   - it never throws: a publish must not fail because the web app could not
 *     be reached. The R2 snapshot is already current; only the web's copy of
 *     it lags, and that is logged.
 *   - it never blocks the caller: the fan-out happens after the caller's
 *     response, and bursts are collapsed into a single request.
 *   - it retries: network errors and 5xx are attempted three times, because a
 *     single dropped request is a stale site with no other signal.
 *   - it does not require configuration to be harmless: an unset secret or
 *     web URL is a warning, not an error.
 */

/**
 * The tags the web app caches the discovery feeds under.
 *
 * Source of truth: `FEED_REVALIDATE_TAGS` in `routes/admin/system.ts` — the
 * admin "Regenerate all" button sends exactly this list. The web route
 * (`apps/web/src/app/api/revalidate/route.ts`) turns every tag into a
 * `revalidateTag(tag, 'max')`.
 *
 * Keep the two lists identical: a tag missing here means the page that reads
 * that feed keeps serving the version it cached first.
 */
export const FEED_REVALIDATE_TAGS = [
    'feed-version',
    'homepage-feed',
    'feed-index',
    'government-feed',
    'expired-feed',
    'companies-metadata',
    // Redirect/ever-published map for /companies/{slug}. Without this the web
    // keeps serving a stale alias map and a renamed company's old URL 404s
    // until the data cache entry is evicted some other way.
    'company-slug-history',
    'category-shards',
    'company-shards',
    'skills-metadata',
    'education-metadata',
    'sitemap-data',
] as const;

const REVALIDATE_PATH = '/api/revalidate';
const REQUEST_TIMEOUT_MS = 5_000;
/**
 * A publish must not depend on the web being reachable on the first try.
 * Delivery is retried on network errors and 5xx; a 4xx (bad secret, bad body)
 * will not improve, so it stops immediately. Without this, every transient
 * blip left the site serving the previous feed until an operator noticed.
 */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;
/**
 * Bursts are collapsed. A bulk publish of 100 listings would otherwise send
 * 100 requests to a route the web rate-limits to 60/minute, and the requests
 * that get rejected are exactly the ones that matter.
 */
const COALESCE_WINDOW_MS = 1_000;
/**
 * How long a path-only change waits for a feed announcement to carry it.
 *
 * Detail paths must not reach the web BEFORE the rebuild that changes them:
 * a revalidatePath makes Next render the page again from the same CDN URL, so
 * announcing first re-caches the snapshot that is about to be replaced. The
 * mutation paths schedule a rebuild within ~5s whose completion announcement
 * flushes these paths with the tags. This fallback is for paths that have no
 * rebuild (an event-timeline edit, for example) so they can never be stranded.
 */
const PATHS_FALLBACK_DELAY_MS = 30_000;

/**
 * Parse a configured web origin before fetching it. Rejects non-http(s)
 * origins so a malformed PUBLIC_WEB_URL entry can never turn the
 * revalidation fan-out into a server-side request forgery vector.
 *
 * Copied from the helper in `routes/admin/system.ts` on purpose: the admin
 * button and this service must agree on what a valid web origin is.
 */
function parseRevalidateBaseUrl(raw: string): string | null {
    try {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

/**
 * Every web origin that has to be told.
 *
 * `PUBLIC_WEB_URL` first, then `PUBLIC_FRONTEND_URL`, then `FRONTEND_URL`.
 * The value may list several origins, comma separated: each Vercel project has
 * its own Next data cache, so an origin that is not listed keeps serving the
 * feed version it cached first even though the CDN files are current.
 */
function resolveWebOrigins(): string[] {
    const configured =
        process.env.PUBLIC_WEB_URL ||
        process.env.PUBLIC_FRONTEND_URL ||
        process.env.FRONTEND_URL ||
        '';

    const origins: string[] = [];
    for (const entry of configured.split(',')) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const origin = parseRevalidateBaseUrl(trimmed);
        if (!origin) {
            logger.error('[webRevalidation] Skipping invalid web origin entry', { entry: trimmed });
            continue;
        }
        if (!origins.includes(origin)) origins.push(origin);
    }
    return origins;
}

export interface RevalidationDelivery {
    ok: boolean;
    status?: number;
    /** Enough of the failure to act on: the status and the web's own message. */
    reason?: string;
}

/**
 * POST the feed tag bust to one web origin, with bounded retries.
 *
 * Never rejects — the caller decides what a failure means. This is the single
 * implementation of "tell the web": the publish path, both admin buttons and
 * the worker sweep all call it, so a retry added here is a retry everywhere.
 */
export async function deliverFeedRevalidation(
    origin: string,
    secret?: string,
    paths?: string[],
): Promise<RevalidationDelivery> {
    const token = secret || process.env.REVALIDATE_SECRET_TOKEN;
    if (!token) return { ok: false, reason: 'REVALIDATE_SECRET_TOKEN is not configured' };

    const pathList = Array.from(new Set((paths ?? []).filter(Boolean)));

    let last: RevalidationDelivery = { ok: false, reason: 'not attempted' };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            const response = await fetch(`${origin}${REVALIDATE_PATH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Tags bust the feed pages; paths are the individual detail
                // slugs the web revalidates eagerly. The route hard-blocks the
                // hub paths, so an over-broad path list cannot turn into the
                // ISR write spike this design exists to avoid.
                body: JSON.stringify({
                    secret: token,
                    tags: [...FEED_REVALIDATE_TAGS],
                    ...(pathList.length > 0 ? { paths: pathList } : {}),
                }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });

            if (response.ok) return { ok: true, status: response.status };

            const body = await response.text().catch(() => 'No response body');
            last = {
                ok: false,
                status: response.status,
                reason: `${response.status} ${body}`.slice(0, 300),
            };
            // 4xx: the secret or the body is wrong. Repeating it changes nothing.
            if (response.status < 500) return last;
        } catch (error: unknown) {
            last = { ok: false, reason: error instanceof Error ? error.message : String(error) };
        }

        if (attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt));
        }
    }

    return last;
}

export interface FeedAnnouncementResult {
    /** Origins that were configured and attempted. */
    targets: number;
    delivered: number;
    failures: string[];
    /** Set when there was nothing to attempt (no secret / no origin). */
    skipped: string | null;
}

const MISSING_SECRET_MESSAGE =
    'REVALIDATE_SECRET_TOKEN is not configured on this API, so the web app was not told about the feed change. '
    + 'The CDN feeds are current, but the web keeps serving the previous feed version until the token is set.';
const MISSING_ORIGIN_MESSAGE =
    'No public web origin is configured (PUBLIC_WEB_URL / PUBLIC_FRONTEND_URL / FRONTEND_URL), so the web app '
    + 'was not told about the feed change.';

/**
 * Tell every configured web origin that the CDN feeds moved, and report what
 * actually happened.
 *
 * Never rejects. `failures` is non-empty exactly when a configured origin did
 * not acknowledge the bust — the only signal that separates "the site is
 * fresh" from "the site is stale and nobody knows".
 */
export async function announceFeedChangeNow(
    reason: string,
    paths: string[] = [],
): Promise<FeedAnnouncementResult> {
    const secret = process.env.REVALIDATE_SECRET_TOKEN;
    if (!secret) {
        logger.warn(MISSING_SECRET_MESSAGE, { trigger: reason });
        return { targets: 0, delivered: 0, failures: [], skipped: MISSING_SECRET_MESSAGE };
    }

    const origins = resolveWebOrigins();
    if (origins.length === 0) {
        logger.warn(MISSING_ORIGIN_MESSAGE, { trigger: reason });
        return { targets: 0, delivered: 0, failures: [], skipped: MISSING_ORIGIN_MESSAGE };
    }

    const failures: string[] = [];
    await Promise.all(
        origins.map(async (origin) => {
            const result = await deliverFeedRevalidation(origin, secret, paths);
            if (result.ok) return;
            failures.push(`${origin} (${result.reason ?? 'unknown error'})`);
            logger.error('[webRevalidation] Feed revalidation was not delivered', {
                origin,
                status: result.status,
                failure: result.reason,
                trigger: reason,
            });
        }),
    );

    return {
        targets: origins.length,
        delivered: origins.length - failures.length,
        failures,
        skipped: null,
    };
}

/**
 * Send the tag bust to every configured web origin.
 *
 * Never rejects: a failure here is a stale web cache, not a failed publish.
 */
async function fanOut(reasons: string[], paths: string[]): Promise<void> {
    await announceFeedChangeNow(reasons.join(',') || 'unknown', paths);
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDeadline = 0;
let pendingReasons = new Set<string>();
/** Individual listing paths to revalidate eagerly, coalesced with the tags. */
let pendingPaths = new Set<string>();
let pendingPromise: Promise<void> | null = null;
let pendingResolve: (() => void) | null = null;

/**
 * Announce a feed change to the web app.
 *
 * Fire-and-forget: the returned promise settles after the request has been
 * sent, and it never rejects. Callers are expected to ignore it (`void
 * notifyWebFeedChanged('publish')`) or attach a `.catch()` for logging.
 *
 * `reason` is only used for the log lines — it says which action caused the
 * announcement, which is the difference between "the web is stale" and "the
 * web is stale because a listing was published".
 */
export function notifyWebFeedChanged(reason: string): Promise<void> {
    return notifyWeb(reason, [], COALESCE_WINDOW_MS);
}

/**
 * Tell the web app that one or more listing detail pages changed.
 *
 * The caller (the guest-cache invalidation) already worked out the slug paths;
 * this delivers them instead of leaving them in a Redis set that only the admin
 * "Regenerate all" button ever drained. The tags are sent with them, so a burst
 * of edits is one request, not two.
 *
 * Never rejects and never blocks: the mutation has already succeeded.
 */
export function notifyWebPathsChanged(paths: string[], reason: string): Promise<void> {
    return notifyWeb(reason, paths, PATHS_FALLBACK_DELAY_MS);
}

function notifyWeb(reason: string, paths: string[], delayMs: number): Promise<void> {
    pendingReasons.add(reason);
    for (const path of paths) {
        if (typeof path === 'string' && path) pendingPaths.add(path);
    }

    if (!pendingPromise) {
        pendingPromise = new Promise<void>((resolve) => {
            pendingResolve = resolve;
        });
    }
    const promise = pendingPromise;

    // The EARLIEST pending deadline wins. A feed announcement can therefore
    // accelerate a path fallback (flush now, with everything batched), while
    // a path added after a feed announcement is already queued cannot delay it.
    const deadline = Date.now() + delayMs;
    if (pendingTimer && pendingDeadline <= deadline) return promise;
    pendingDeadline = deadline;

    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        pendingDeadline = 0;
        const reasons = Array.from(pendingReasons);
        const paths = Array.from(pendingPaths);
        pendingReasons = new Set<string>();
        pendingPaths = new Set<string>();
        const resolve = pendingResolve;
        pendingPromise = null;
        pendingResolve = null;

        void fanOut(reasons, paths)
            .catch((error: unknown) => {
                logger.error('[webRevalidation] Feed revalidation notification failed', {
                    reasons,
                    pathCount: paths.length,
                    error: error instanceof Error ? error.message : String(error),
                });
            })
            .finally(() => {
                resolve?.();
            });
    }, Math.max(0, pendingDeadline - Date.now()));

    return promise;
}
