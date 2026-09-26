import { logger } from '@fresherflow/utils';

/**
 * PHASE 19b — worker failure visibility.
 *
 * WHY this exists: the queues were created with `removeOnComplete`/`removeOnFail`
 * but no `attempts` and no `backoff`, so BullMQ's default of a single attempt
 * meant one transient SMTP rejection or one socket timeout killed the job
 * permanently and silently. Retries alone are not enough — if a job keeps
 * failing nobody notices. This module supplies the classification and the
 * redacted descriptor that make those failures visible.
 *
 * PRIVACY CONTRACT (hard rule, not a preference):
 * `job.data` is NEVER read, logged, retained, or attached to a log context. It
 * carries recipient addresses, bot tokens, push auth secrets, post bodies and
 * signed URLs. The descriptor below intentionally carries only non-identifying
 * fields: queue name, job name, job id, attempts made, retry verdict.
 */

/** Maximum length of an error message we are willing to inspect. */
const MAX_ERROR_MESSAGE_LENGTH = 200;

export type FailureCategory =
    | 'transient'   // worth retrying automatically (network, timeout, 5xx, rate limit)
    | 'permanent'   // retrying cannot help (bad config, auth revoked, 4xx other than 429)
    | 'unknown';    // unclassified — treated as retryable so a bug cannot silently kill a job

export type ErrorSignal = {
    name: string;
    code?: string | null;
    statusCode?: number | null;
};

/**
 * Allowlists, not pattern matches.
 *
 * WHY: the root AGENTS.md security rules forbid running broad or
 * nested-quantifier regexes over untrusted error text (ReDoS / CodeQL). So we
 * never regex a message. We match on a closed set of *structural* fields only —
 * `err.name`, `err.code`, `err.statusCode` — plus short exact literal
 * substrings, and only after an explicit length guard.
 */
const TRANSIENT_CODES = new Set([
    'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT',
    'EAI_AGAIN', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'EADDRNOTAVAIL',
    'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT', 'ERR_SOCKET_CONNECTION_TIMEOUT',
    'ECONNRESET_ERROR', 'RATE_LIMIT', 'RATE_LIMITED', 'TOO_MANY_REQUESTS',
]);

const TRANSIENT_ERROR_NAMES = new Set([
    'FetchError', 'AxiosError', 'NetworkError', 'TimeoutError',
    'RequestError', 'TypeError', 'RangeError', 'OverloadedError', 'BusyError',
]);

const PERMANENT_ERROR_NAMES = new Set([
    'AuthenticationError', 'AuthorizationError', 'NotConfiguredError',
    'ValidationError', 'ZodError', 'PrismaClientKnownRequestError',
    'PrismaClientValidationError', 'MissingConfigError',
    'InvalidJobError', 'SyntaxError', 'ReferenceError', 'TypeDefError',
]);

/** Short, exact literals only. No wildcards, no quantifiers — nothing to backtrack. */
const PERMANENT_MESSAGE_LITERALS = [
    'not configured',
    'unknown job name',
    'unknown platform',
    'unsupported platform',
    'unsupported media type',
    'invalid job name',
];

const PERMANENT_STATUS_CODES = new Set([400, 401, 403, 404, 405, 410, 422]);

function asErrorSignal(err: unknown): ErrorSignal {
    if (typeof err !== 'object' || err === null) {
        return { name: 'NonError' };
    }
    const e = err as { name?: unknown; code?: unknown; statusCode?: unknown };
    return {
        name: typeof e.name === 'string' ? e.name : 'Error',
        code: typeof e.code === 'string' ? e.code : null,
        statusCode: typeof e.statusCode === 'number' ? e.statusCode : null,
    };
}

/**
 * Classify a thrown value as retryable or not.
 *
 * Order matters: an explicit transient code or 429 beats a 4xx, because a rate
 * limited request is the one 4xx that genuinely benefits from a retry. Anything
 * unrecognised is `unknown`, which callers treat as retryable — an unclassified
 * failure is far more likely to be a new dependency's socket error than a
 * deterministic logic bug, and silently dropping it is the bug we are fixing.
 */
export function classifyFailure(err: unknown): FailureCategory {
    const signal = asErrorSignal(err);
    const status = signal.statusCode ?? undefined;

    if (status === 429) return 'transient';
    if (signal.code && TRANSIENT_CODES.has(signal.code)) return 'transient';
    if (status !== undefined && (status === 408 || status === 425 || status >= 500)) {
        return 'transient';
    }

    if (status !== undefined && PERMANENT_STATUS_CODES.has(status)) return 'permanent';
    if (PERMANENT_ERROR_NAMES.has(signal.name)) return 'permanent';

    if (typeof err === 'object' && err !== null) {
        // WHY the length guard: this is the only place we touch free text, and
        // the repo rule requires an explicit bound before inspecting untrusted
        // strings. We truncate to MAX_ERROR_MESSAGE_LENGTH before comparing.
        const raw = (err as { message?: unknown }).message;
        if (typeof raw === 'string' && raw.length > 0) {
            const lowered = raw.slice(0, MAX_ERROR_MESSAGE_LENGTH).toLowerCase();
            for (const literal of PERMANENT_MESSAGE_LITERALS) {
                if (lowered.includes(literal)) return 'permanent';
            }
        }
    }

    if (TRANSIENT_ERROR_NAMES.has(signal.name)) return 'transient';

    return 'unknown';
}

export function isRetryable(err: unknown): boolean {
    return classifyFailure(err) !== 'permanent';
}


export type JobDescriptor = {
    queue: string;
    name: string;
    jobId: string;
    attemptsMade: number;
    /** Whether BullMQ will run this job again after the current failure. */
    willRetry: boolean;
    category: FailureCategory;
};

export type JobLike = {
    name: string;
    id?: string | null;
    attemptsMade: number;
    opts?: { attempts?: number };
};

/**
 * Build the log-safe descriptor for a failed job.
 *
 * WHY no `job.data`, no `err.message`, no stack: those carry PII and secrets.
 * The operator gets enough to locate the job in Redis (`queue` + `jobId`)
 * without the log pipeline ever holding a recipient address or a bot token.
 */
export function describeFailedJob(params: { queue: string; job: JobLike; error: unknown }): JobDescriptor {
    const category = classifyFailure(params.error);
    const maxAttempts = params.job.opts?.attempts ?? 1;
    return {
        queue: params.queue,
        name: params.job.name,
        jobId: params.job.id ?? 'unknown',
        attemptsMade: params.job.attemptsMade,
        willRetry: isRetryable(params.error) && params.job.attemptsMade < maxAttempts,
        category,
    };
}

/**
 * Structured, redacted log for a single failed attempt. A retry is normal (warn
 * on every attempt); exhaustion is not (escalated to error so it is paged on).
 * Only the descriptor is ever handed to the logger.
 */
export function logJobFailure(params: { queue: string; job: JobLike; error: unknown }): JobDescriptor {
    const descriptor = describeFailedJob(params);
    if (descriptor.willRetry) {
        logger.warn('[queue] Job attempt failed; will retry', { ...descriptor });
    } else {
        logger.error('[queue] Job failed permanently', { ...descriptor });
    }
    return descriptor;
}
