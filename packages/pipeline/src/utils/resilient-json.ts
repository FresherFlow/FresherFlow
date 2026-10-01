/**
 * Resilient JSON loading for the scheduled bots.
 *
 * Bots used to treat every JSON source as a hard requirement: one missing CDN
 * object or one transient 5xx failed the whole run and produced nothing. These
 * helpers never throw — they return a typed result so each caller can decide
 * what "source unavailable" means for its own stage and still finish its work.
 */

/** Statuses worth retrying: request timeout, too early, rate limited, server error. */
function isRetryableStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

export type JsonFetchResult<T> =
    | { ok: true; data: T; attempts: number }
    | { ok: false; reason: string; status: number | null; attempts: number };

export interface JsonFetchOptions {
    /** Human-readable name used in logs, e.g. `bootstrap-feed.min.json`. */
    label?: string;
    /** Total attempts including the first. Default 3. */
    attempts?: number;
    /** Per-attempt timeout. Default 20s. */
    timeoutMs?: number;
    /** Base backoff between attempts; grows linearly. Default 2000ms. */
    backoffMs?: number;
    headers?: Record<string, string>;
    /**
     * Return false when the payload parsed but is not usable (wrong shape).
     * A failed validation is treated like a bad response: retried, then reported.
     */
    validate?: (data: unknown) => boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch and parse JSON, retrying only transient failures.
 *
 * 4xx fails immediately — a missing object will still be missing on retry, and
 * retrying only delays the fallback. Network errors, 408/425/429 and 5xx are
 * retried with linear backoff.
 */
export async function fetchJsonWithRetry<T = unknown>(
    url: string,
    options: JsonFetchOptions = {},
): Promise<JsonFetchResult<T>> {
    const { label = 'json', attempts = 3, timeoutMs = 20_000, backoffMs = 2_000, headers, validate } = options;
    let lastReason = 'unknown error';
    let lastStatus: number | null = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const res = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(timeoutMs),
            });

            if (!res.ok) {
                lastStatus = res.status;
                lastReason = `HTTP ${res.status} ${res.statusText}`.trim();
                // 4xx is a definitive answer — the object is missing or rejected.
                if (!isRetryableStatus(res.status) || attempt === attempts) break;
            } else {
                let parsed: unknown;
                try {
                    parsed = await res.json();
                } catch (parseErr) {
                    lastStatus = res.status;
                    lastReason = `invalid JSON body (${parseErr instanceof Error ? parseErr.message : String(parseErr)})`;
                    if (attempt === attempts) break;
                }
                if (validate && !validate(parsed)) {
                    lastStatus = res.status;
                    lastReason = 'unexpected JSON shape';
                    if (attempt === attempts) break;
                } else {
                    return { ok: true, data: parsed as T, attempts: attempt };
                }
            }
        } catch (err) {
            lastStatus = null;
            lastReason = err instanceof Error ? err.message : String(err);
            if (attempt === attempts) break;
        }

        console.warn(`  ↻ [${label}] attempt ${attempt}/${attempts} failed (${lastReason}); retrying in ${backoffMs * attempt}ms`);
        await sleep(backoffMs * attempt);
    }

    return { ok: false, reason: lastReason, status: lastStatus, attempts };
}

/**
 * Read and parse a local JSON file without throwing.
 *
 * Returns `null` for a missing, unreadable, or malformed file so callers can
 * fall back instead of crashing the run.
 */
export async function readJsonFileSafe<T = unknown>(filePath: string): Promise<T | null> {
    try {
        const fs = await import('node:fs/promises');
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/** `JSON.stringify` that never throws — circular structures degrade to a marker. */
export function safeJsonStringify(value: unknown, space?: number): string {
    const seen = new WeakSet<object>();
    try {
        return JSON.stringify(
            value,
            (_key, val) => {
                if (typeof val === 'object' && val !== null) {
                    if (seen.has(val as object)) return '[Circular]';
                    seen.add(val as object);
                }
                return val;
            },
            space,
        );
    } catch {
        return 'null';
    }
}