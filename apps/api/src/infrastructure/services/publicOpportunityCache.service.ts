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

            // Revalidate only the canonical path for this opportunity type.
            // Previously 5 paths were fired per slug regardless of type — that caused
            // ~5x unnecessary ISR writes on every publish/expire/delete action.
            // Use slug (canonical) if available; the UUID fallback is still included
            // since redirect logic in the page handles UUID → slug.
            const slug = idsOrSlugs.find(v => !v.match(/^[0-9a-f-]{36}$/i)) ?? idsOrSlugs[0];
            const pathsToRevalidate = [getCanonicalPath(slug)];

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

