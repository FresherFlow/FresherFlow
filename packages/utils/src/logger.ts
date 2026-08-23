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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consoleFormat = winston.format.printf(({ level, message, timestamp, requestId, service, ...meta }: any) => {
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

    const isProduction = process.env.NODE_ENV === 'production';
    const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: (isProduction || isServerless)
                ? winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
                : winston.format.combine(
                    winston.format.timestamp(),
                    consoleFormat
                )
        })
    ];

    return winston.createLogger({
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        defaultMeta: { service: serviceName },
        transports
    });
};

export const logger = createLogger('fresherflow-app');

export function setupCleanLogging() {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].includes('Prisma')) return;
        originalWarn(...args);
    };
}

export default logger;
