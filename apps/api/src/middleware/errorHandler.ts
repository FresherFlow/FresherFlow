import { Request, Response } from 'express';
import { logger } from '@fresherflow/logger';
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
    res: Response
) {
    const databaseUnavailable = isDatabaseUnavailableError(err);
    const statusCode = databaseUnavailable ? 503 : (err.statusCode || 500);

    if (statusCode >= 500) {
        TelegramService.notifyError(`${req.method} ${req.path}`, err).catch(() => { });
    }

    const errorMsg = err.message || 'Unknown error';
    const location = `${req.method} ${req.path}`;
    const isPrismaError = databaseUnavailable || errorMsg.includes('Prisma') || errorMsg.includes('does not exist in the current database');

    if (isPrismaError) {
        logger.error(chalk.red('Database Error'));
        logger.error(chalk.gray(`  ${errorMsg.split('\n')[0]}`));
        if (databaseUnavailable) {
            logger.error(chalk.yellow('  -> Check DATABASE_URL / DIRECT_DATABASE_URL and database availability'));
        } else {
            logger.error(chalk.yellow('  -> Run: npm run db:push to sync database'));
        }
    } else if (statusCode === 401 || statusCode === 404) {
        logger.warn(chalk.yellow(`${statusCode === 401 ? 'Auth' : 'NotFound'}: ${errorMsg.split('\n')[0]}`));
        logger.warn(chalk.gray(`  at ${location}`));
    } else {
        logger.error(chalk.red(`Error: ${errorMsg.split('\n')[0]}`));
        logger.error(chalk.gray(`  at ${location}`));
    }

    if (process.env.NODE_ENV !== 'production') {
        logger.error(chalk.red('[DEV] Full error:'), err);
    } else if (process.env.DEBUG) {
        logger.error('Full error details', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const technicalKeywords = /prisma|neon|aws|database|sql|connect/i;
    const isTechnical = technicalKeywords.test(err.message || '');
    const isOperational = (err.isAppError || err.isOperational) && !isTechnical;

    const message = databaseUnavailable
        ? 'Database is temporarily unavailable. Please try again shortly.'
        : isDev
            ? (err.message || 'Unknown error')
            : isOperational
                ? err.message
                : 'A system error occurred. Please check your connection and try again.';

    res.status(statusCode).json({
        error: {
            message,
            code: databaseUnavailable ? 'DB_UNAVAILABLE' : (err.code || err.name || 'UNKNOWN_ERROR'),
            statusCode,
            ...(isDev && {
                stack: err.stack,
            })
        }
    });
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
