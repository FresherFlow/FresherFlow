import { NextFunction, Request, Response } from 'express';
import { logger } from '@fresherflow/utils';
import chalk from 'chalk';
import TelegramService from '../infrastructure/services/telegram.service';

interface ExtendedError extends Error {
    statusCode?: number;
    code?: string;
    isAppError?: boolean;
    isOperational?: boolean;
    name: string;
}

function isDatabaseUnavailableError(err: ExtendedError): boolean {
    const message = err.message || '';
    return (
        err.name === 'PrismaClientInitializationError' ||
        message.includes("Can't reach database server") ||
        message.includes('Authentication failed against database server') ||
        message.includes('does not exist in the current database') ||
        message.includes('Invalid `prisma.')
    );
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
    const isPrismaError = databaseUnavailable || errorMsg.includes('Prisma') || errorMsg.includes('does not exist in the current database');

    if (isPrismaError) {
        logger.error(chalk.red('Database Error'));
        logger.error(chalk.gray(`  ${errorMsg.split('\n')[0]}`));
        if (databaseUnavailable) {
            logger.error(chalk.yellow('  -> Check DATABASE_URL / DIRECT_DATABASE_URL and database availability'));
        } else {
            logger.error(chalk.yellow('  -> Run: npm run db:push to sync database'));
        }
    } else if (statusCode === 429) {
        // Rate limit — expected client error, not an application error. Keep logs clean like reference apps (dub/cal)
        logger.warn(chalk.yellow(`RateLimit: ${errorMsg.split('\n')[0]}`));
        logger.warn(chalk.gray(`  at ${location}`));
    } else if (statusCode === 401 || statusCode === 404) {
        logger.warn(chalk.yellow(`${statusCode === 401 ? 'Auth' : 'NotFound'}: ${errorMsg.split('\n')[0]}`));
        logger.warn(chalk.gray(`  at ${location}`));
    } else {
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

        if (!isCommonAuthError && !isRateLimited && !isExpectedOtpError) {
            logger.error(chalk.red(`[DEV] Full error [requestId=${requestId}]:`), err);
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
