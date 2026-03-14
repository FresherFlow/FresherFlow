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

export async function invalidatePublicOpportunityCache(options?: {
    idsOrSlugs?: string[];
    purgeFeed?: boolean;
}) {
    const idsOrSlugs = Array.from(new Set((options?.idsOrSlugs || []).filter(Boolean)));
    const purgeFeed = options?.purgeFeed !== false;

    try {
        if (purgeFeed) {
            await deleteByPattern('opportunities|v2|*');
        }

        if (idsOrSlugs.length > 0) {
            const detailKeys = idsOrSlugs.map((value) => `opportunity_detail|v1|id:${value}`);
            await redis.del(...detailKeys);
        }
        logger.debug('Invalidated public opportunity cache', { idsOrSlugs, purgeFeed });
    } catch (error: unknown) {
        logger.error('[Redis] Failed to invalidate public opportunity cache', { error: error instanceof Error ? error.message : String(error) });
    }
}

