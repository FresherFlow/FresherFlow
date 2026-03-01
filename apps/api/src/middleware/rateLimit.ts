import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import Redis from 'ioredis';

// In-memory fallback store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

let redisClient: Redis | null = null;

function getRedisClient() {
    if (process.env.NODE_ENV === 'development' || process.env.REDIS_ENABLED === 'false') return null;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    if (!redisClient) {
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000
        });
        redisClient.on('error', (err) => {
            console.error('[Redis] Rate limit connection error:', err.message);
        });
    }
    return redisClient;
}

interface RateLimitOptions {
    windowMs: number;
    max: number;
    message: string;
    keyPrefix?: string;
}

/**
 * Generic Rate Limiting Middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip rate limiting in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }

        // Use X-Forwarded-For if behind a proxy, otherwise req.ip
        const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown-ip';
        const key = `${options.keyPrefix || 'rl'}:${ip}`;
        const now = Date.now();
        const redis = getRedisClient();

        if (redis) {
            try {
                const count = await redis.incr(key);
                if (count === 1) {
                    await redis.pexpire(key, options.windowMs);
                }

                const ttl = await redis.pttl(key);

                res.setHeader('X-RateLimit-Limit', options.max);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - count));
                res.setHeader('X-RateLimit-Reset', new Date(now + ttl).toUTCString());

                if (count > options.max) {
                    return next(new AppError(options.message, 429));
                }
                return next();
            } catch (err) {
                console.error('[RateLimit] Redis failure, falling back to memory:', err);
            }
        }

        // Fallback to in-memory store
        const entry = rateLimitStore.get(key);

        if (!entry || entry.resetAt < now) {
            const newEntry = {
                count: 1,
                resetAt: now + options.windowMs
            };
            rateLimitStore.set(key, newEntry);

            res.setHeader('X-RateLimit-Limit', options.max);
            res.setHeader('X-RateLimit-Remaining', options.max - 1);
            res.setHeader('X-RateLimit-Reset', new Date(newEntry.resetAt).toUTCString());

            return next();
        }

        entry.count += 1;
        const remaining = Math.max(0, options.max - entry.count);

        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toUTCString());

        if (entry.count > options.max) {
            return next(new AppError(options.message, 429));
        }

        next();

        // Background cleanup (very simple)
        if (rateLimitStore.size > 1000) {
            for (const [k, v] of rateLimitStore.entries()) {
                if (v.resetAt < now) rateLimitStore.delete(k);
            }
        }
    };
}
