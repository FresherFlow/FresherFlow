import { redis } from '@fresherflow/database';
import type { RunTarget } from './runner.js';

export async function checkCache(target: RunTarget): Promise<any | null> {
    if (target.noCache) return null;
    
    const key = `ingestion:cache:${target.ats}:${target.slug}`;
    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.error('Redis cache error:', e);
    }
    return null;
}

export async function setCache(target: RunTarget, data: any): Promise<void> {
    if (target.noCache) return;

    const key = `ingestion:cache:${target.ats}:${target.slug}`;
    try {
        await redis.setex(key, 3600, JSON.stringify(data)); // 1-hour TTL
    } catch (e) {
        console.error('Redis cache error:', e);
    }
}
