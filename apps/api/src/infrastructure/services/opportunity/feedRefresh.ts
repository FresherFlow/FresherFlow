import { logger } from '@fresherflow/utils';

/**
 * Fire-and-forget feed rebuild for content-changing actions.
 *
 * Hub and list pages (/jobs, /internships, /walk-ins, /govt, /companies) are
 * served from the R2 JSON feeds — `feeds/bootstrap-feed.min.json`,
 * `feeds/feed-index.json` and friends. Those objects are ONLY produced by
 * `StaticFeedService.refresh()`. Invalidating Next.js tags does not rebuild
 * them: a tag bust makes Next re-read the same R2 URL, so a publish, expire or
 * archive that never rebuilds the feed stays invisible on the site, no matter
 * how many times an operator presses "Refresh cache". That is exactly how this
 * platform ends up serving months-old listings.
 *
 * So every content-changing path calls this. `StaticFeedService` debounces the
 * calls (FEED_REFRESH_DEBOUNCE_MS, default 5s), which collapses a bulk action
 * into a single DB read + R2 upload.
 *
 * Deliberately detached:
 *   - the admin request must not wait on a feed rebuild, and
 *   - a rebuild failure must not fail the action the operator just performed
 *     (the R2 write and the audit record already succeeded). It is logged, and
 *     the regenerate button remains the manual escape hatch.
 *
 * The returned promise settles when the rebuild has finished (successfully or
 * not) so a caller can chain "now tell the web app" onto it. The web app must
 * be told AFTER the rebuild: a tag bust only makes Next re-read the same CDN
 * URL, so announcing the change before the new snapshot exists re-caches the
 * feed version that is about to be replaced.
 *
 * The promise never rejects — callers can ignore it entirely.
 *
 * Loaded lazily because the feed service pulls in storage/R2 and Prisma feed
 * machinery that a lifecycle route otherwise never touches.
 */
export function scheduleDiscoveryFeedRefresh(target: string = 'bootstrap'): Promise<void> {
    return import('./staticFeed.service')
        .then(({ StaticFeedService }) => Promise.resolve(StaticFeedService.scheduleRefresh(target)))
        .catch((error: unknown) => {
            logger.error('[feedRefresh] Failed to schedule a discovery feed rebuild', {
                target,
                error: error instanceof Error ? error.message : String(error),
            });
        });
}
