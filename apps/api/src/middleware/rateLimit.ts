import { Request, Response, NextFunction } from 'express';
import { redis } from '@fresherflow/database';
import { AppError } from './errorHandler';
import { logger } from '@fresherflow/utils';

// In-memory fallback store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_FALLBACK_RATE_LIMIT_KEYS = 10_000;
let nextFallbackCleanupAt = 0;

/** Clears the in-memory fallback counters. Test-only helper so suites that make
 *  many writes from one IP do not leak rate-limit state into later cases. */
export function resetRateLimitStoreForTests() {
    rateLimitStore.clear();
}

function isRedisEnabled() {
    return process.env.REDIS_ENABLED !== 'false';
}

interface RateLimitOptions {
    windowMs: number;
    max: number;
    message: string;
    keyPrefix?: string;
    /**
     * Overrides the bucket key. Defaults to `req.ip`.
     *
     * Only for routes that are already authenticated and where several distinct
     * people share one caller IP — the MCP server is a single process forwarding
     * every connected user's calls, so an IP-keyed bucket there would make one
     * person's submissions exhaust everyone else's budget.
     */
    keyGenerator?: (req: Request) => string;
}

/**
 * Generic Rate Limiting Middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Key on `req.ip`, which `app.set('trust proxy', 1)` in `src/index.ts`
        // resolves from exactly one proxy hop. The raw `x-forwarded-for` header
        // is client-supplied before it reaches that proxy: keying on it let any
        // caller mint a fresh bucket per request by rotating the header, which
        // made every limiter built on this factory bypassable with one curl —
        // including the auth and OTP limiters.
        const bucket = options.keyGenerator ? options.keyGenerator(req) : (req.ip || 'unknown-ip');
        const key = `${options.keyPrefix || 'rl'}:${bucket}`;
        const now = Date.now();

        if (isRedisEnabled()) {
            try {
                // Keep increment + expiry atomic. If the process dies between
                // separate INCR/PEXPIRE calls, the bucket could otherwise stay
                // in Redis forever and permanently reject that identity.
                let count: number;
                let ttl: number;
                if ('eval' in redis) {
                    const result = await redis.eval(
                        "local count = redis.call('INCR', KEYS[1]); "
                        + "local ttl = redis.call('PTTL', KEYS[1]); "
                        + "if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = redis.call('PTTL', KEYS[1]); end; "
                        + "return { count, ttl };",
                        1,
                        key,
                        options.windowMs,
                    ) as [number, number];
                    [count, ttl] = result;
                } else {
                    // The lightweight in-memory Redis stand-in used by local
                    // tests does not implement Lua; preserve its compatible path.
                    count = await redis.incr(key);
                    if (count === 1) await redis.pexpire(key, options.windowMs);
                    ttl = await redis.pttl(key);
                }

                res.setHeader('X-RateLimit-Limit', options.max);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - count));
                res.setHeader('X-RateLimit-Reset', new Date(now + Math.max(0, ttl)).toUTCString());

                if (count > options.max) {
                    return next(new AppError(options.message, 429));
                }
                return next();
            } catch (err: unknown) {
                logger.error('[RateLimit] Redis failure, falling back to memory', { error: err });
            }
        }

        // Fallback to in-memory store
        if (now >= nextFallbackCleanupAt) {
            for (const [storedKey, storedEntry] of rateLimitStore) {
                if (storedEntry.resetAt <= now) rateLimitStore.delete(storedKey);
            }
            nextFallbackCleanupAt = now + 60_000;
        }
        const entry = rateLimitStore.get(key);

        if (!entry || entry.resetAt < now) {
            // Redis outages must not turn an attacker-controlled key space into
            // unbounded process memory. Evict oldest entries at a hard ceiling;
            // Redis remains the authoritative shared limiter in production.
            while (rateLimitStore.size >= MAX_FALLBACK_RATE_LIMIT_KEYS) {
                const oldest = rateLimitStore.keys().next().value;
                if (oldest === undefined) break;
                rateLimitStore.delete(oldest);
            }
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

    };
}
