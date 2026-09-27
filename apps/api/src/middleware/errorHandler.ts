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
    _next: NextFunction
) {
    const databaseUnavailable = isDatabaseUnavailableError(err);
    const statusCode = databaseUnavailable ? 503 : (err.statusCode || 500);
    const requestId = (req as Request & { requestId?: string }).requestId
        || (req.headers['x-request-id'] as string | undefined)
        || 'unknown';

    if (statusCode >= 500) {
        TelegramService.notifyError(`${req.method} ${req.path}`, err).catch(() => { });
    }

    const errorMsg = err.message || 'Unknown error';
    const location = `${req.method} ${req.path} [requestId=${requestId}]`;
    const connectionDown = isDatabaseConnectionError(err);
    const missingObject = missingSchemaObject(err);
    const isPrismaError = connectionDown || missingObject !== null || errorMsg.includes('Invalid `prisma.');

    // Collapse the repeats that strict mode and client retries produce.
    const signature = `${err.name}|${missingObject || errorMsg.split('\n')[0]}`;
    const isFirstOccurrence = isRepeatOf(signature) === 1;

    if (isFirstOccurrence && connectionDown) {
        logger.error(chalk.red(`Database unreachable [requestId=${requestId}]`));
        logger.error(chalk.gray(`  ${errorMsg.split('\n')[0]}`));
        logger.error(chalk.yellow('  -> Check DATABASE_URL / DIRECT_DATABASE_URL and database availability'));
    } else if (isFirstOccurrence && missingObject) {
        // Deploy-order problem, not a crash: the running API is newer than the
        // database. One line naming the missing object is the whole fix.
        logger.warn(chalk.yellow(`Database schema out of date: missing ${missingObject} [requestId=${requestId}]`));
        logger.warn(chalk.gray(`  ${location}`));
        logger.warn(chalk.gray('  -> Apply pending migrations (pnpm db:push); API is newer than the database'));
    } else if (isFirstOccurrence && isPrismaError) {
        logger.error(chalk.red(`Prisma Error [requestId=${requestId}]`));
        logger.error(chalk.gray(`  ${errorMsg.split('\n')[0]}`));
        logger.error(chalk.gray(`  at ${location}`));
    } else if (isFirstOccurrence && statusCode === 429) {
        // Rate limit — expected client error, not an application error. Keep logs clean like reference apps (dub/cal)
        logger.warn(chalk.yellow(`RateLimit: ${errorMsg.split('\n')[0]}`));
        logger.warn(chalk.gray(`  at ${location}`));
    } else if (isFirstOccurrence && (statusCode === 401 || statusCode === 404)) {
        logger.warn(chalk.yellow(`${statusCode === 401 ? 'Auth' : 'NotFound'}: ${errorMsg.split('\n')[0]}`));
        logger.warn(chalk.gray(`  at ${location}`));
    } else if (isFirstOccurrence) {
        logger.error(chalk.red(`Error: ${errorMsg.split('\n')[0]}`));
        logger.error(chalk.gray(`  at ${location}`));
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
            // Schema and connection failures already printed their cause and fix
            // above; repeating them as a dump only buries it.
            if (!missingObject && !connectionDown) {
                for (const line of describeErrorForLog(err)) {
                    logger.error(chalk.gray(line));
                }
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
    const rawMessage = databaseUnavailable
        ? 'Database is temporarily unavailable. Please try again shortly.'
        : statusCode < 500 && isOperational
            ? (err.message || 'Unknown error')
            : statusCode < 500
                ? sanitizeClientMessage(err.message || 'Unknown error')
                : 'A system error occurred. Please check your connection and try again.';
    const message = sanitizeClientMessage(rawMessage);

    const code = databaseUnavailable
        ? 'DB_UNAVAILABLE'
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
 * Render an error as a few short lines instead of one JSON blob.
 *
 * Prisma puts a multi-line code frame inside `message` and then repeats the same
 * frames in `stack`, so passing the raw error to the logger stringified one
 * failure into ~40 lines that said the same thing twice. Keep the call, the
 * failing location, the cause and the top frames; the untouched error is still
 * on the request for anything that needs the full stack.
 */
function describeErrorForLog(err: ExtendedError): string[] {
    const lines: string[] = [];
    const raw = String(err.message || '');
    const parts = raw.split('\n').map((l) => l.trim()).filter(Boolean);

    const call = parts.find((l) => l.startsWith('Invalid `prisma.'));
    const location = parts.find((l) => /\.ts:\d+:\d+$/.test(l));
    // Prisma states the cause after the code frame, so it is the last line.
    const reason = parts.length > 0 ? parts[parts.length - 1] : '';

    if (call) lines.push(`  call: ${call.replace(/^Invalid `| in$/g, '')}`);
    if (location) lines.push(`  at: ${location}`);
    if (reason && reason !== call) lines.push(`  reason: ${reason}`);

    for (const frame of String(err.stack || '').split('\n').slice(1, 4)) {
        const trimmed = frame.trim();
        if (trimmed) lines.push(`  ${trimmed}`);
    }

    if (lines.length === 0) {
        lines.push(`  ${err.name}: ${raw.split('\n')[0] || 'Unknown error'}`);
    }
    return lines;
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
