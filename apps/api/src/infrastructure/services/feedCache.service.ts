import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';
import { env } from '@fresherflow/config';

export class FeedCacheService {
    private static TTL_SECONDS = 60; // 60 seconds

    /**
     * Builds a standard cache key based on query filters.
     */
    static buildKey(filterType: string = 'all', city: string = 'all', page: number = 1): string {
        return `feed:opportunities:${filterType}:${city}:p${page}`;
    }

    /**
     * Retrieves feed from cache if available.
     */
    static async get<T = unknown>(key: string): Promise<T | null> {
        if (!redis) return null;
        try {
            const data = await redis.get(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            logger.warn(`Failed to read from FeedCacheService for key ${key}:`, error);
        }
        return null;
    }

    /**
     * Stores feed in cache for a short TTL.
     */
    static async set(key: string, data: unknown): Promise<void> {
        if (!redis || env.NODE_ENV === 'development') return; // Don't cache rigidly locally for dev velocity
        try {
            await redis.set(key, JSON.stringify(data), 'EX', this.TTL_SECONDS);
        } catch (error) {
            logger.warn(`Failed to write to FeedCacheService for key ${key}:`, error);
        }
    }

    /**
     * Flushes global feed namespaces when an extreme global write occurs (optional).
     */
    static async invalidateGlobal(filterType?: string) {
        if (!redis) return;
        try {
            const keys = await redis.keys(`feed:opportunities:${filterType || '*'}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (error) {
            logger.error('Failed to invalidate FeedCacheService namespace:', error);
        }
    }
}
