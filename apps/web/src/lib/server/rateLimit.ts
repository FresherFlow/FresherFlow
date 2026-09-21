import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
    keyPrefix?: string;
}

interface RateLimitBucket {
    hits: number;
    resetAt: number;
}

const store = new Map<string, RateLimitBucket>();

const CLEANUP_THRESHOLD = 10_000;

function getClientKey(request: NextRequest, keyPrefix: string): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const rawIp = forwarded
        ? forwarded.split(',')[0].trim()
        : request.headers.get('x-real-ip') || 'unknown';
    const hash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16);
    return `${keyPrefix}:${hash}`;
}

export function withRateLimit(
    handler: (request: NextRequest, context?: unknown) => Promise<NextResponse> | NextResponse,
    options: RateLimitOptions = {}
) {
    const windowMs = options.windowMs ?? 60_000;
    const max = options.max ?? 30;
    const message = options.message ?? 'Too many requests, please try again later.';
    const keyPrefix = options.keyPrefix ?? 'rl';

    return async (request: NextRequest, context?: unknown) => {
        const now = Date.now();

        if (store.size >= CLEANUP_THRESHOLD) {
            for (const [key, bucket] of store) {
                if (bucket.resetAt <= now) {
                    store.delete(key);
                }
            }
        }

        const key = getClientKey(request, keyPrefix);
        const existing = store.get(key);

        let hits: number;
        let resetAt: number;

        if (existing && existing.resetAt > now) {
            hits = existing.hits + 1;
            resetAt = existing.resetAt;
        } else {
            hits = 1;
            resetAt = now + windowMs;
        }

        const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

        if (hits > max) {
            return NextResponse.json(
                { error: message },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(max),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
                        'Retry-After': String(retryAfterSeconds),
                    },
                }
            );
        }

        store.set(key, { hits, resetAt });

        const response = await handler(request, context);

        const headers = new Headers(response.headers);
        headers.set('X-RateLimit-Limit', String(max));
        headers.set('X-RateLimit-Remaining', String(max - hits));
        headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    };
}
