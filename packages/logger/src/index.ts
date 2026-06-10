import type winston from 'winston';

const sanitizeMeta = (meta: Record<string, unknown>) => {
    if (!meta.error || typeof meta.error !== 'object') return meta;

    const err = meta.error as Error;
    return {
        ...meta,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    };
};

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';

export const createLogger = (serviceName: string) => {
    if (isBrowser) {
        return {
            info: (msg: string, meta?: unknown) => console.log(`[${serviceName}] INFO:`, msg, meta || ''),
            warn: (msg: string, meta?: unknown) => console.warn(`[${serviceName}] WARN:`, msg, meta || ''),
            error: (msg: string, meta?: unknown) => console.error(`[${serviceName}] ERROR:`, msg, meta || ''),
            debug: (msg: string, meta?: unknown) => console.debug(`[${serviceName}] DEBUG:`, msg, meta || ''),
        } as unknown as winston.Logger;
    }

    // Server-side dynamically require winston and chalk to prevent bundling into client-side code
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const win = require('winston');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chalk = require('chalk');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consoleFormat = win.format.printf(({ level, message, timestamp, requestId, service, ...meta }: any) => {
        const time = chalk.gray(new Date(timestamp as string).toLocaleTimeString());
        const reqId = requestId && typeof requestId === 'string' ? chalk.gray(`[${requestId.substring(0, 8)}]`) : '';
        const svc = service ? chalk.magenta(`[${service}]`) : '';

        const levelStyles: Record<string, (value: string) => string> = {
            info: chalk.blue,
            warn: chalk.yellow,
            error: chalk.red,
            debug: chalk.cyan
        };

        const renderLevel = (levelStyles[level] || chalk.white)(level.toUpperCase().padEnd(5));
        const metaEntries = Object.keys(meta).length > 0 ? chalk.dim(JSON.stringify(sanitizeMeta(meta as Record<string, unknown>))) : '';

        const baseLog = `${time} ${svc} ${renderLevel} ${chalk.white(String(message))} ${reqId} ${metaEntries}`.trim();

        if (level === 'error') {
            return `\n${chalk.red('╔════════════════════ ERROR ════════════════════')}\n${baseLog}\n${chalk.red('╚══════════════════════════════════════════════')}\n`;
        }

        return baseLog;
    });

    const isProd = process.env.NODE_ENV === 'production';
    const useJsonLogs = process.env.LOG_FORMAT === 'json' || isProd;

    return win.createLogger({
        level: isProd ? 'info' : 'debug',
        format: win.format.combine(
            win.format.timestamp(),
            win.format.errors({ stack: true })
        ),
        defaultMeta: { service: serviceName },
        transports: [
            new win.transports.Console({
                format: useJsonLogs
                    ? win.format.combine(
                        win.format.timestamp(),
                        win.format.errors({ stack: true }),
                        win.format.json()
                      )
                    : consoleFormat
            })
        ]
    });
};

// Default logger for convenience
const defaultLogger = createLogger('fresherflow');

export const log = {
    info: (message: string, meta?: unknown) => defaultLogger.info(message, meta),
    warn: (message: string, meta?: unknown) => defaultLogger.warn(message, meta),
    error: (message: string, meta?: unknown) => defaultLogger.error(message, meta),
    debug: (message: string, meta?: unknown) => defaultLogger.debug(message, meta),
    success: (message: string) => defaultLogger.info(`SUCCESS: ${message}`),
};

export const logger = defaultLogger;
export default defaultLogger;

/**
 * Global utility to suppress noisy environment warnings (e.g. BullMQ eviction policy)
 * and non-critical operational errors like health check ECONNRESETs.
 */
export function setupCleanLogging() {
    const BANNED_MESSAGES = [
        'Eviction policy is volatile-lru',
        'Eviction policy is allkeys-lru',
        'It should be "noeviction"'
    ];

    const BANNED_ERRORS = [
        'ECONNRESET',
        'ECONNREFUSED'
    ];

    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: unknown[]) => {
        const msg = args.join(' ');
        if (BANNED_MESSAGES.some(b => msg.includes(b))) return;
        originalWarn(...args);
    };

    console.error = (...args: unknown[]) => {
        const msg = args.join(' ');
        // Suppress common health-check connection resets in production logs
        if (BANNED_ERRORS.some(b => msg.includes(b)) && process.env.NODE_ENV === 'production') {
            return;
        }
        originalError(...args);
    };

    // Also hook into process-level errors if needed
    if (typeof process !== 'undefined') {
        process.on('uncaughtException', (err) => {
            if (BANNED_ERRORS.some(b => err.message.includes(b))) return;
            logger.error('Uncaught Exception', { error: err });
        });
    }
}
