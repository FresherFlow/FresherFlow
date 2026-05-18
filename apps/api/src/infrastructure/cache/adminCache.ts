/**
 * Simple in-memory cache for Admin data to reduce Neon DB hits.
 * Includes explicit invalidation for "Edit-First" logic.
 */

type CacheEntry = {
    timestamp: number;
    data: unknown;
};

class AdminCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes

    get(key: string) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(key: string, data: unknown) {
        this.cache.set(key, {
            timestamp: Date.now(),
            data
        });
    }

    /**
     * Clear specific keys or the whole admin cache.
     * Call this whenever an admin EDITS a job.
     */
    invalidate(pattern?: string) {
        if (!pattern) {
            this.cache.clear();
            return;
        }

        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Invalidate all list-related caches.
     * Useful when a single job is updated.
     */
    invalidateLists() {
        for (const key of this.cache.keys()) {
            if (key.startsWith('list_') || key.startsWith('summary_')) {
                this.cache.delete(key);
            }
        }
    }
}

export const adminCache = new AdminCache();
