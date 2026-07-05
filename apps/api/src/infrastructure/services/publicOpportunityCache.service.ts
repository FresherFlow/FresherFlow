import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';

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

function getCanonicalPath(slugOrId: string): string {
    return `/${slugOrId}`;
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
            await deleteByPattern('opportunities|v4|*');
        }

        const pathsToRevalidate: string[] = [];

        if (idsOrSlugs.length > 0) {
            for (const value of idsOrSlugs) {
                await deleteByPattern(`opportunity_detail|v3|*|id:${value}`);
            }

            const uuid = idsOrSlugs.find(v => !!v.match(/^[0-9a-f-]{36}$/i));
            const slug = idsOrSlugs.find(v => !v.match(/^[0-9a-f-]{36}$/i)) ?? idsOrSlugs[0];
            pathsToRevalidate.push(getCanonicalPath(slug));
            
            if (uuid) {
                pathsToRevalidate.push(`/government-jobs/${uuid}`);
            }
        }

        // Queue paths and tags in Redis to be processed during "Generate JSON"
        // This ensures the CDN is actually updated before we tell Next.js to fetch from it
        if (pathsToRevalidate.length > 0) {
            await redis.sadd('pending_cache_paths', ...pathsToRevalidate);
        }
        if (tags.length > 0) {
            await redis.sadd('pending_cache_tags', ...tags);
        }

        logger.debug('Queued public opportunity cache invalidations', { paths: pathsToRevalidate, tags, purgeFeed });
    } catch (error: unknown) {
        logger.error('[Redis] Failed to queue public opportunity cache invalidations', { error: error instanceof Error ? error.message : String(error) });
    }
}

