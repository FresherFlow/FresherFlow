import { NextFunction, Request, Response } from 'express';
import { logger } from '@fresherflow/utils';
import chalk from 'chalk';
import TelegramService from '../infrastructure/services/alerts/telegram.service';

interface ExtendedError extends Error {
    statusCode?: number;
    code?: string;
    isAppError?: boolean;
    isOperational?: boolean;
    name: string;
}

/**
 * Schema drift reads like a database outage in Prisma's message, so the old
 * single check told operators to inspect DATABASE_URL when the database was
 * healthy and a migration was simply unapplied. Keep the two apart: one is a
 * connectivity problem, the other is a deploy-order problem.
 */
const MISSING_SCHEMA_RE = /The (column|table|enum|type) `?([\w."]+)`? does not exist in the current database/;

function isDatabaseConnectionError(err: ExtendedError): boolean {
    const message = err.message || '';
    return (
        err.name === 'PrismaClientInitializationError' ||
        message.includes("Can't reach database server") ||
        message.includes('Authentication failed against database server')
    );
}

/** The specific column/table/enum the database is missing, e.g. `column Opportunity.category`. */
function missingSchemaObject(err: ExtendedError): string | null {
    const match = (err.message || '').match(MISSING_SCHEMA_RE);
    return match ? `${match[1]} ${match[2]}` : null;
}

function isDatabaseUnavailableError(err: ExtendedError): boolean {
    return isDatabaseConnectionError(err) || missingSchemaObject(err) !== null;
}

/** Kept for callers that only need "is this a database problem of any kind". */
export const isDatabaseProblem = isDatabaseUnavailableError;

/**
 * One page load fires the same failing query several times (React strict mode
 * double-render, then the client retry). Log the first occurrence in full and
 * collapse the rest, so a single missing column does not produce five
 * near-identical multi-line blocks in two seconds.
 */
const repeatCounts = new Map<string, { count: number; lastAt: number }>();
const REPEAT_WINDOW_MS = 10_000;

function isRepeatOf(signature: string): number {
    const now = Date.now();
    const prev = repeatCounts.get(signature);
    if (prev && now - prev.lastAt < REPEAT_WINDOW_MS) {
        prev.count += 1;
        prev.lastAt = now;
        return prev.count;
    }
    repeatCounts.set(signature, { count: 1, lastAt: now });
    if (repeatCounts.size > 100) {
        for (const [key, value] of repeatCounts) {
            if (now - value.lastAt >= REPEAT_WINDOW_MS) repeatCounts.delete(key);
        }
    }
    return 1;
}

export function errorHandler(
    err: ExtendedError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // A handler that already started a response (a streamed file, a partially
    // written body) cannot have its status or body replaced. Calling
    // `res.status().json()` here would throw ERR_HTTP_HEADERS_SENT inside the
    // error handler itself, which surfaces as an unhandled rejection and leaves
    // the client with a truncated response. Delegate to Express, which closes
    // the connection and destroys the socket.
    if (res.headersSent) {
        return next(err);
    }

    // Only a genuinely unreachable database is 503. A missing column is a
    // deployment misconfiguration: the server is up and the database is
    // reachable, it just does not have the schema yet. Returning 503 for that
    // made every client treat an unfixable error as retryable and hammer it.
    const connectionDown = isDatabaseConnectionError(err);
    const missingObject = missingSchemaObject(err);
    const statusCode = connectionDown ? 503 : (err.statusCode || 500);
    const requestId = (req as Request & { requestId?: string }).requestId
        || (req.headers['x-request-id'] as string | undefined)
        || 'unknown';

    if (statusCode >= 500) {
        TelegramService.notifyError(`${req.method} ${req.path}`, err).catch(() => { });
    }

    const errorMsg = err.message || 'Unknown error';
    const location = `${req.method} ${req.path} [requestId=${requestId}]`;
    const isPrismaError = connectionDown || missingObject !== null || errorMsg.includes('Invalid `prisma.');

    // Prisma prefixes its message with a newline and a code frame, so
    // `split('\n')[0]` is an empty string and the headline rendered as a bare
    // "Prisma Error [requestId=…] — " with nothing after the dash. Take the first
    // line that actually has content.
    const headline = errorMsg.split('\n').map((l) => l.trim()).find(Boolean) || 'Unknown error';

    // Collapse the repeats that strict mode and client retries produce.
    const signature = `${err.name}|${missingObject || headline}`;
    const isFirstOccurrence = isRepeatOf(signature) === 1;

    // One logger call per failure. Each branch used to fire two or three
    // separate calls, so a single 401 printed as a headline, an "at" line and
    // then the HTTP request line — three lines for one event.
    if (isFirstOccurrence) {
        if (connectionDown) {
            logger.error(chalk.red(
                `Database unreachable [requestId=${requestId}] — ${headline}\n` +
                '  -> Check DATABASE_URL / DIRECT_DATABASE_URL and database availability'
            ));
        } else if (missingObject) {
            // Deploy-order problem, not a crash: the running API is newer than
            // the database. One line naming the missing object is the fix.
            logger.warn(chalk.yellow(
                `Database schema out of date: missing ${missingObject} [requestId=${requestId}]\n` +
                `  ${location}\n` +
                '  -> Apply pending migrations; API is newer than the database'
            ));
        } else if (isPrismaError) {
            // Print the cause, not just the headline. `describeErrorForLog` reduces the
            // multi-line Prisma message to call / reason / at, so this single line is
            // the whole story and the dev block below no longer needs to repeat it.
            logger.error(chalk.red(
                `Prisma Error [requestId=${requestId}] — ${describeErrorForLog(err)}\n  at ${location}`
            ));
        } else if (statusCode === 429) {
            // Rate limit — expected client error, not an application error.
            logger.warn(chalk.yellow(`RateLimit: ${headline} [requestId=${requestId}]`));
        } else if (statusCode === 401 || statusCode === 404) {
            logger.warn(chalk.yellow(`${statusCode === 401 ? 'Auth' : 'NotFound'}: ${headline} [${location}]`));
        } else {
            logger.error(chalk.red(`Error: ${headline} [requestId=${requestId}]\n  at ${location}`));
        }
    }

    if (process.env.NODE_ENV !== 'production') {
        const trimmedMsg = errorMsg.trim();
        const isRateLimited = statusCode === 429 || trimmedMsg.includes('Too many failed attempts') || trimmedMsg.includes('Too many verification codes');
        const isExpectedOtpError = statusCode === 401 && (
            trimmedMsg.includes('Invalid verification code') ||
            trimmedMsg.includes('No OTP found') ||
            trimmedMsg.includes('OTP expired') ||
            trimmedMsg.includes('Too many failed attempts')
        );
        const isCommonAuthError = statusCode === 401 && (
            trimmedMsg.includes('No token provided') ||
            trimmedMsg.includes('Authorization header missing') ||
            trimmedMsg.includes('Authentication required')
        );

        if (!isCommonAuthError && !isRateLimited && !isExpectedOtpError && isFirstOccurrence) {
            // Schema, connection and Prisma-query failures already printed their cause
            // and fix above; repeating them here is what printed a second banner box
            // under the same requestId for one failure.
            if (!missingObject && !connectionDown && !isPrismaError) {
                logger.error(chalk.gray(describeErrorForLog(err)));
            }
        }
    } else if (process.env.DEBUG) {
        logger.error('Full error details', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            requestId
        });
    }

    const technicalKeywords = /prisma|neon|aws|database|sql|connect/i;
    const isTechnical = technicalKeywords.test(err.message || '');
    const isOperational = (err.isAppError || err.isOperational) && !isTechnical;

    // Client errors (4xx, incl. Zod validation via AppError) keep their exact
    // message so validation text stays identical. Anything 5xx or technical
    // becomes a generic message in EVERY env; filesystem paths and stacks
    // never leave the server (full details stay in server logs with requestId).
    const rawMessage = connectionDown
        ? 'Database is temporarily unavailable. Please try again shortly.'
        : statusCode < 500 && isOperational
            ? (err.message || 'Unknown error')
            : statusCode < 500
                ? sanitizeClientMessage(err.message || 'Unknown error')
                : 'A system error occurred. Please check your connection and try again.';
    const message = sanitizeClientMessage(rawMessage);

    // DB_UNAVAILABLE is reserved for a real outage. A pending migration is a
    // distinct condition so alerts and dashboards can tell them apart.
    const code = connectionDown
        ? 'DB_UNAVAILABLE'
        : missingObject
            ? 'DB_SCHEMA_OUT_OF_DATE'
            : sanitizeErrorCode(err.code || (isOperational ? err.name : undefined) || 'UNKNOWN_ERROR');

    res.status(statusCode).json({
        error: {
            message,
            code,
            requestId
        }
    });
}

/**
 * Render an error as ONE multi-line string, not a dump and not a stack of
 * separate log calls (each of which produced its own banner box, so a single
 * failure printed five near-identical boxes).
 *
 * Prisma puts a multi-line code frame inside `message` and repeats the frames
 * in `stack`, so stringifying the whole error said the same thing twice across
 * ~40 lines. Keep the call, the location, the cause and the top frames, and
 * never repeat a cause that is already the headline.
 */
function describeErrorForLog(err: ExtendedError): string {
    const lines: string[] = [];
    const raw = String(err.message || '');
    const parts = raw.split('\n').map((l) => l.trim()).filter(Boolean);

    const call = parts.find((l) => l.startsWith('Invalid `prisma.'));
    const location = parts.find((l) => /\.ts:\d+:\d+$/.test(l));
    // Prisma states the cause after the code frame, so it is the last line.
    const reason = parts.length > 0 ? parts[parts.length - 1] : '';
    const headline = parts.length > 0 ? parts[0] : '';

    if (call) lines.push(`call: ${call.replace(/^Invalid `| in$/g, '')}`);
    if (reason && reason !== call && reason !== headline) lines.push(`reason: ${reason}`);
    if (location) lines.push(`at: ${location}`);

    for (const frame of String(err.stack || '').split('\n').slice(1, 4)) {
        const trimmed = frame.trim();
        // Skip frames we already reported as `at:`.
        if (trimmed && !trimmed.startsWith('at ')) continue;
        if (trimmed && location && trimmed.includes(location)) continue;
        if (trimmed) lines.push(trimmed);
    }

    if (lines.length === 0) {
        return `${err.name}: ${headline || 'Unknown error'}`;
    }
    return lines.join('\n  ');
}

function sanitizeClientMessage(input: string): string {
    // Keep only the first line (drops appended "at ..." stack frames), strip
    // filesystem paths, cap length. Validation sentences pass through untouched.
    const firstLine = (input || '').split('\n')[0].trim();
    if (!firstLine) return 'Unknown error';
    if (firstLine.length > 10000) return 'Invalid request. Please check your input and try again.';
    let out = firstLine
        .replace(/[A-Za-z]:\\[^\s"']*/g, '[path]')
        .replace(/\/(app|home|usr|var|tmp|opt|srv)[^\s"']*/g, '[path]')
        .replace(/\s+at\s+[^\s]+\s+\([^)]*\)/g, '')
        .replace(/\.ts:\d+:\d+/g, '')
        .replace(/\.js:\d+:\d+/g, '');
    if (out.length > 500) out = `${out.slice(0, 497)}...`;
    return out || 'Unknown error';
}

function sanitizeErrorCode(input: string): string {
    const clean = (input || '').split('\n')[0].trim().slice(0, 64);
    if (!clean) return 'UNKNOWN_ERROR';
    if (/[\\/]|\.ts|\.js|node_modules|Error stack/i.test(clean)) return 'UNKNOWN_ERROR';
    return clean;
}

export class AppError extends Error {
    statusCode: number;
    isAppError: boolean;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        this.isAppError = true;
        this.isOperational = true;
    }
}

/**
 * Stable, machine-readable error codes.
 *
 * `message` is for humans and may be reworded at any time; `code` is the
 * contract a client branches on, so treat these as append-only. Anything not
 * listed here reaches the client as `UNKNOWN_ERROR` (see `errorHandler`).
 */
export const ErrorCode = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INTERNAL: 'INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Send an error using the one envelope every client already understands:
 * `{ error: { code, message, requestId } }`.
 *
 * Route handlers were hand-rolling three incompatible shapes — a bare
 * `{ message }`, a string `{ error: '...' }`, and the real envelope — and
 * `packages/api-client` can only recover a message from the last one, so the
 * string form silently degraded to "Request failed (400)" on mobile. Prefer
 * throwing `new AppError(message, status)` inside a handler (the error handler
 * then derives the code); use this helper for the early returns where a route
 * responds directly.
 */
export function sendError(
    res: Response,
    statusCode: number,
    code: ErrorCodeValue,
    message: string,
    requestId?: string,
    details?: unknown
): Response {
    return res.status(statusCode).json({
        error: {
            code,
            message,
            requestId: requestId ?? 'unknown',
            // Field-level validation detail for clients that can highlight the
            // offending input. Omitted entirely when there is nothing to say, so
            // the key never carries a misleading empty value.
            ...(details === undefined ? {} : { details }),
        },
    });
}
