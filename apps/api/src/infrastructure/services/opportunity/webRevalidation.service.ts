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
 * Bursts are collapsed. A bulk publish of 100 listings would otherwise send
 * 100 requests to a route the web rate-limits to 60/minute, and the requests
 * that get rejected are exactly the ones that matter.
 */
const COALESCE_WINDOW_MS = 1_000;

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

/**
 * Send the tag bust to every configured web origin.
 *
 * Never rejects: a failure here is a stale web cache, not a failed publish.
 */
async function fanOut(reasons: string[]): Promise<void> {
    const secret = process.env.REVALIDATE_SECRET_TOKEN;
    if (!secret) {
        logger.warn(
            '[webRevalidation] REVALIDATE_SECRET_TOKEN is not configured on this API, so the web app '
                + 'was not told about the feed change. The CDN feeds are current, but the web keeps '
                + 'serving the previous feed version until the token is set.',
            { reasons },
        );
        return;
    }

    const origins = resolveWebOrigins();
    if (origins.length === 0) {
        logger.warn(
            '[webRevalidation] No public web origin is configured (PUBLIC_WEB_URL / PUBLIC_FRONTEND_URL '
                + '/ FRONTEND_URL), so the web app was not told about the feed change.',
            { reasons },
        );
        return;
    }

    await Promise.all(
        origins.map(async (origin) => {
            try {
                const response = await fetch(`${origin}${REVALIDATE_PATH}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret, tags: [...FEED_REVALIDATE_TAGS] }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                if (!response.ok) {
                    const body = await response.text().catch(() => 'No response body');
                    logger.error('[webRevalidation] Feed revalidation request was refused', {
                        origin,
                        status: response.status,
                        body,
                        reasons,
                    });
                }
            } catch (error: unknown) {
                logger.error('[webRevalidation] Feed revalidation request could not be delivered', {
                    origin,
                    error: error instanceof Error ? error.message : String(error),
                    reasons,
                });
            }
        }),
    );
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingReasons = new Set<string>();
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
    pendingReasons.add(reason);

    if (!pendingPromise) {
        pendingPromise = new Promise<void>((resolve) => {
            pendingResolve = resolve;
        });
    }
    const promise = pendingPromise;

    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        const reasons = Array.from(pendingReasons);
        pendingReasons = new Set<string>();
        const resolve = pendingResolve;
        pendingPromise = null;
        pendingResolve = null;

        void fanOut(reasons)
            .catch((error: unknown) => {
                logger.error('[webRevalidation] Feed revalidation notification failed', {
                    reasons,
                    error: error instanceof Error ? error.message : String(error),
                });
            })
            .finally(() => {
                resolve?.();
            });
    }, COALESCE_WINDOW_MS);

    return promise;
}
