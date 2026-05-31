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
            await deleteByPattern('opportunities|v4|*');
        }

        if (idsOrSlugs.length > 0) {
            for (const value of idsOrSlugs) {
                await deleteByPattern(`opportunity_detail|v3|*|id:${value}`);
            }

            // Ping Vercel to revalidate the specific ISR paths for these jobs/internships
            const pathsToRevalidate = idsOrSlugs.flatMap(slug => [
                `/jobs/${slug}`,
                `/internships/${slug}`,
                `/opportunities/${slug}`,
                `/walk-ins/details/${slug}`,
                `/walk-ins/opportunity/${slug}`
            ]);

            const secret = process.env.REVALIDATE_SECRET_TOKEN;
            const webUrl = process.env.PUBLIC_WEB_URL || 'https://fresherflow.in';
            if (secret && webUrl) {
                try {
                    await fetch(`${webUrl}/api/revalidate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ secret, paths: pathsToRevalidate })
                    });
                } catch (e) {
                    logger.warn('[Revalidate] Failed to ping Vercel for on-demand revalidation', { error: e instanceof Error ? e.message : String(e) });
                }
            }
        }
        logger.debug('Invalidated public opportunity cache', { idsOrSlugs, purgeFeed });
    } catch (error: unknown) {
        logger.error('[Redis] Failed to invalidate public opportunity cache', { error: error instanceof Error ? error.message : String(error) });
    }
}
