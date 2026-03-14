import winston from 'winston';
import chalk from 'chalk';

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

const consoleFormat = winston.format.printf(({ level, message, timestamp, requestId, service, ...meta }) => {
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

export const createLogger = (serviceName: string) => {
    const isProd = process.env.NODE_ENV === 'production';
    const useJsonLogs = process.env.LOG_FORMAT === 'json' || isProd;

    return winston.createLogger({
        level: isProd ? 'info' : 'debug',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true })
        ),
        defaultMeta: { service: serviceName },
        transports: [
            new winston.transports.Console({
                format: useJsonLogs
                    ? winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.errors({ stack: true }),
                        winston.format.json()
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
    process.on('uncaughtException', (err) => {
        if (BANNED_ERRORS.some(b => err.message.includes(b))) return;
        logger.error('Uncaught Exception', { error: err });
    });
}
