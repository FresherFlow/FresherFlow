import { Request, Response, NextFunction } from 'express';
import { redis } from '@fresherflow/redis';
import { AppError } from './errorHandler';

// In-memory store for rate limiting (per admin, per hour)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRedisEnabled() {
    return process.env.REDIS_ENABLED !== 'false';
}

/**
 * Admin Rate Limiting Middleware
 * Enforces 100 create/edit actions per admin per hour
 *
 * Keyed by: adminId + hour window
 */
export async function adminRateLimit(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting in development or test
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return next();
    }

    if (!req.adminId) {
        return next(new AppError('Admin ID not found', 401));
    }

    const nowMs = Date.now();
    const currentHour = Math.floor(nowMs / (1000 * 60 * 60));
    const key = `${req.adminId}:${currentHour}`;

    if (isRedisEnabled()) {
        try {
            const resetAt = (currentHour + 1) * (1000 * 60 * 60);
            const ttlSeconds = Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
            const redisKey = `admin_rate:${key}`;
            const count = await redis.incr(redisKey);
            if (count === 1) {
                await redis.expire(redisKey, ttlSeconds);
            }
            if (count > 100) {
                const resetIn = Math.ceil((resetAt - nowMs) / (1000 * 60));
                return next(new AppError(
                    `Rate limit exceeded. Maximum 100 operations per hour. Try again in ${resetIn} minutes.`,
                    429
                ));
            }
            return next();
        } catch {
            // Fall back to in-memory if Redis is unavailable
        }
    }

    const entry = rateLimitStore.get(key);

    if (!entry) {
        rateLimitStore.set(key, {
            count: 1,
            resetAt: (currentHour + 1) * (1000 * 60 * 60)
        });
        return next();
    }

    if (entry.count >= 100) {
        const resetIn = Math.ceil((entry.resetAt - nowMs) / (1000 * 60));
        return next(new AppError(
            `Rate limit exceeded. Maximum 100 operations per hour. Try again in ${resetIn} minutes.`,
            429
        ));
    }

    entry.count += 1;
    rateLimitStore.set(key, entry);

    for (const [storeKey, value] of rateLimitStore.entries()) {
        if (value.resetAt < nowMs) {
            rateLimitStore.delete(storeKey);
        }
    }

    next();
}

