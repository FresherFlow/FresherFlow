import Redis from 'ioredis';

let redisClient: Redis | null = null;

function getRedisClient() {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    if (!redisClient) {
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000
        });
        redisClient.on('error', (err) => {
            console.error('[Redis] Public opportunity cache error:', err.message);
        });
    }
    return redisClient;
}

async function deleteByPattern(redis: Redis, pattern: string) {
    let cursor = '0';
    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = nextCursor;
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } while (cursor !== '0');
}

export async function invalidatePublicOpportunityCache(options?: {
    idsOrSlugs?: string[];
    purgeFeed?: boolean;
}) {
    const redis = getRedisClient();
    if (!redis) return;

    const idsOrSlugs = Array.from(new Set((options?.idsOrSlugs || []).filter(Boolean)));
    const purgeFeed = options?.purgeFeed !== false;

    try {
        if (purgeFeed) {
            await deleteByPattern(redis, 'opportunities|v2|*');
        }

        if (idsOrSlugs.length > 0) {
            const detailKeys = idsOrSlugs.map((value) => `opportunity_detail|v1|id:${value}`);
            await redis.del(...detailKeys);
        }
    } catch (error) {
        console.error('[Redis] Failed to invalidate public opportunity cache:', error);
    }
}

