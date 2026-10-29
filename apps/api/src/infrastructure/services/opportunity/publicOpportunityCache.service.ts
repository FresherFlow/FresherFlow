import { redis } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import { notifyWebPathsChanged } from './webRevalidation.service';

/**
 * ── Guest cache keys ─────────────────────────────────────────────────────────
 * The guest (anonymous) feed and detail responses are cached in Redis so the
 * public read path does not touch Postgres once per request.
 *
 * The key layout below is the ONLY place it is written down. The routes that
 * WRITE the cache and the invalidation that PURGES it both build their keys
 * from these functions, which is the only way the two can be guaranteed to
 * agree. They used to hard-code `opportunities|v4|*` and
 * `opportunity_detail|v3|*|id:<value>` in the purge while the routes wrote
 * `v5` keys with a different segment order — so the purge matched nothing and
 * stale guest responses survived until their TTL expired.
 */
export const GUEST_FEED_CACHE_VERSION = 'v5';
export const GUEST_DETAIL_CACHE_VERSION = 'v5';

const GUEST_FEED_CACHE_PREFIX = 'opportunities';
const GUEST_DETAIL_CACHE_PREFIX = 'opportunity_detail';

/** Every segment of the guest feed key, in the order it is written. */
export interface GuestFeedCacheKeyParts {
    siteMode: string;
    feedType: string;
    type: string;
    city: string;
    tag: string;
    minSalary: string | number;
    maxSalary: string | number;
    sort: string;
    page: number;
    limit: number;
}

export function buildGuestFeedCacheKey(parts: GuestFeedCacheKeyParts): string {
    return [
        GUEST_FEED_CACHE_PREFIX,
        GUEST_FEED_CACHE_VERSION,
        `mode:${parts.siteMode}`,
        `feed:${parts.feedType}`,
        `type:${parts.type}`,
        `city:${parts.city}`,
        `tag:${parts.tag}`,
        `min:${parts.minSalary}`,
        `max:${parts.maxSalary}`,
        `sort:${parts.sort}`,
        `page:${parts.page}`,
        `limit:${parts.limit}`,
    ].join('|');
}

export function buildGuestDetailCacheKey(siteMode: string, id: string): string {
    return `${GUEST_DETAIL_CACHE_PREFIX}|${GUEST_DETAIL_CACHE_VERSION}|mode:${siteMode}|id:${id}`;
}

/**
 * The purge pattern for the whole guest feed.
 *
 * Mirrors {@link buildGuestFeedCacheKey}: the literal prefix plus the version
 * segment, then a wildcard for the filter segments. A key the route writes
 * (`opportunities|v5|mode:private|feed:all|...`) matches this pattern.
 */
export function guestFeedCachePurgePattern(): string {
    return `${GUEST_FEED_CACHE_PREFIX}|${GUEST_FEED_CACHE_VERSION}|*`;
}

/**
 * The purge pattern for one guest detail entry, in either site mode.
 *
 * Mirrors {@link buildGuestDetailCacheKey}: the literal prefix plus the version
 * segment, the `mode:` segment with a wildcard for the mode itself, and the
 * literal `id:` segment with the id or slug. The key the route writes
 * (`opportunity_detail|v5|mode:private|id:<id>`) matches this pattern.
 */
export function guestDetailCachePurgePattern(idOrSlug: string): string {
    return `${GUEST_DETAIL_CACHE_PREFIX}|${GUEST_DETAIL_CACHE_VERSION}|mode:*|id:${escapeRedisGlob(idOrSlug)}`;
}

/**
 * Redis glob metacharacters. The purge pattern is a glob, so an unescaped
 * `*` or `?` inside a value would widen the match and delete keys the
 * invalidation must never touch.
 */
function escapeRedisGlob(value: string): string {
    return value.replace(/([\\*?[\]])/g, '\\$1');
}

async function deleteByPattern(pattern: string) {
    let cursor = '0';
    try {
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== '0');
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Redis] Delete by pattern failed', { pattern, error });
    }
}

function getCanonicalPath(slugOrId: string, type?: string): string {
    if (type === 'GOVERNMENT') return `/govt/${slugOrId}`;
    return `/jobs/${slugOrId}`;
}

export async function invalidatePublicOpportunityCache(options?: {
    idsOrSlugs?: string[];
    purgeFeed?: boolean;
    type?: string; // 'JOB' | 'INTERNSHIP' | 'WALKIN' — narrows ISR path to revalidate
    tags?: string[];
}) {
    const idsOrSlugs = Array.from(new Set((options?.idsOrSlugs || []).filter(Boolean)));
    const tags = Array.from(new Set((options?.tags || []).filter(Boolean)));
    const purgeFeed = options?.purgeFeed !== false;

    try {
        if (purgeFeed) {
            await deleteByPattern(guestFeedCachePurgePattern());
        }

        const pathsToRevalidate: string[] = [];

        if (idsOrSlugs.length > 0) {
            for (const value of idsOrSlugs) {
                await deleteByPattern(guestDetailCachePurgePattern(value));
            }

            const slug = idsOrSlugs.find(v => !v.match(/^[0-9a-f-]{36}$/i)) ?? idsOrSlugs[0];
            // Use type-aware path so revalidatePath targets the correct Next.js route:
            // /jobs/[slug] for standard jobs, /govt/[slug] for government jobs.
            pathsToRevalidate.push(getCanonicalPath(slug, options?.type));
        }

        // Convert tags to paths for background revalidation
        const tagPaths = tags.map(tag => {
            if (tag === 'hub-jobs') return '/jobs';
            if (tag === 'hub-internships') return '/jobs/internships';
            if (tag === 'hub-walkins') return '/jobs/walkins';
            if (tag === 'hub-government') return '/govt';
            if (tag.startsWith('company-')) return `/companies/${tag.replace('company-', '')}`;
            if (tag.startsWith('location-')) return `/locations/${tag.replace('location-', '')}`;
            if (tag.startsWith('skill-')) return `/skills/${tag.replace('skill-', '')}`;
            if (tag.startsWith('batch-')) return `/batch/${tag.replace('batch-', '')}`;
            if (tag.startsWith('role-')) return `/roles/${tag.replace('role-', '')}`;
            return null;
        }).filter(Boolean) as string[];

        pathsToRevalidate.push(...tagPaths);

        // Deliver the paths to the web app now.
        //
        // These used to be appended to a Redis set (`pending_cache_paths`)
        // that only the admin "Regenerate all" handler ever drained — so a
        // published or edited listing's detail page stayed cached until an
        // operator pressed a button, and the set grew without bound in
        // between. The announcement is coalesced and never rejects (the write
        // this follows has already succeeded), so a burst of edits is one
        // request.
        if (pathsToRevalidate.length > 0) {
            void notifyWebPathsChanged(pathsToRevalidate, 'cache-invalidation');
        }

        logger.debug('Queued public opportunity cache invalidations', { paths: pathsToRevalidate, purgeFeed });
    } catch (error: unknown) {
        logger.error('[Redis] Failed to queue public opportunity cache invalidations', { error: error instanceof Error ? error.message : String(error) });
    }
}

