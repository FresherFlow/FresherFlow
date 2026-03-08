import { Request, Response, NextFunction } from 'express';
import { logger } from '@fresherflow/logger';
import chalk from 'chalk';
import TelegramService from '../services/telegram.service';

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // ... (existing logging code)

    const statusCode = err.statusCode || 500;

    // Alert Admin on Critical 500 Errors (excluding 404/401/403)
    if (statusCode >= 500) {
        // Fire and forget (don't await to avoid slowing response)
        TelegramService.notifyError(`${req.method} ${req.path}`, err).catch(() => { });
    }

    // Clean error logging (no messy stack traces in terminal)
    const errorMsg = err.message || 'Unknown error';
    const location = `${req.method} ${req.path}`;

    // Detect Prisma database errors and show clean message
    const isPrismaError = errorMsg.includes('Prisma') || errorMsg.includes('does not exist in the current database');
    // statusCode is already defined above

    if (isPrismaError) {
        console.log(chalk.red(`✖ Database Error`));
        console.log(chalk.gray(`  ${errorMsg.split('\n')[0]}`)); // First line only
        console.log(chalk.yellow(`  → Run: npm run db:push to sync database`));
    } else if (statusCode === 401 || statusCode === 404) {
        // Log authentication or not found as warnings (less alarming)
        console.log(chalk.yellow(`⚠ ${statusCode === 401 ? 'Auth' : 'NotFound'}: ${errorMsg.split('\n')[0]}`));
        console.log(chalk.gray(`  at ${location}`));
    } else {
        // Log clean error message
        console.log(chalk.red(`✖ Error: ${errorMsg.split('\n')[0]}`)); // First line only
        console.log(chalk.gray(`  at ${location}`));
    }

    // Always log full stack in dev so nothing is hidden
    if (process.env.NODE_ENV !== 'production') {
        console.error(chalk.red('[DEV] Full error:'), err);
    } else if (process.env.DEBUG) {
        logger.error('Full error details', {
            requestId: req.requestId,
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
    }

    const isDev = process.env.NODE_ENV !== 'production';

    // In dev: always return the real error so nothing is hidden
    // In prod: sanitize technical internals
    const technicalKeywords = /prisma|neon|aws|invocation|→|database|sql|connect/i;
    const isTechnical = technicalKeywords.test(err.message || '');
    const isOperational = (err.isAppError || err.isOperational) && !isTechnical;

    const message = isDev
        ? (err.message || 'Unknown error')
        : isOperational
            ? err.message
            : 'A system error occurred. Please check your connection and try again.';

    res.status(statusCode).json({
        error: {
            message,
            code: err.code || err.name || 'UNKNOWN_ERROR',
            statusCode,
            requestId: req.requestId,
            ...(isDev && {
                stack: err.stack,
            })
        }
    });
}

// Custom error class
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

