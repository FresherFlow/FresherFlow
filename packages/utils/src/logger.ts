export interface Logger {
    info(message: string, ...meta: unknown[]): void;
    warn(message: string, ...meta: unknown[]): void;
    error(message: string, ...meta: unknown[]): void;
    debug(message: string, ...meta: unknown[]): void;
}

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';

const sanitizeMeta = (meta: unknown): unknown => {
    if (!meta || typeof meta !== 'object') return meta;
    if (meta instanceof Error) {
        return {
            name: meta.name,
            message: meta.message,
            stack: meta.stack
        };
    }
    const rec = meta as Record<string, unknown>;
    if (rec.error && typeof rec.error === 'object') {
        const err = rec.error as Error;
        return {
            ...rec,
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack
            }
        };
    }
    return meta;
};

// ANSI Color codes for zero-dependency terminal formatting in Node.js
const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    white: '\x1b[37m'
};

export const createLogger = (serviceName: string): Logger => {
    if (isBrowser) {
        return {
            info: (msg: string, ...meta: unknown[]) => console.info(`[${serviceName}]`, msg, ...meta),
            warn: (msg: string, ...meta: unknown[]) => console.warn(`[${serviceName}]`, msg, ...meta),
            error: (msg: string, ...meta: unknown[]) => console.error(`[${serviceName}]`, msg, ...meta),
            debug: (msg: string, ...meta: unknown[]) => console.debug(`[${serviceName}]`, msg, ...meta),
        };
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const log = (level: 'info' | 'warn' | 'error' | 'debug', message: string, meta: unknown[]) => {
        const timestamp = new Date().toISOString();
        const cleanMeta = meta.map(sanitizeMeta);

        if (isProduction) {
            const entry: Record<string, unknown> = {
                timestamp,
                level,
                service: serviceName,
                message,
            };
            if (cleanMeta.length === 1 && typeof cleanMeta[0] === 'object' && cleanMeta[0] !== null) {
                Object.assign(entry, cleanMeta[0]);
            } else if (cleanMeta.length > 0) {
                entry.meta = cleanMeta;
            }
            const out = JSON.stringify(entry);
            if (level === 'error') {
                process.stderr.write(out + '\n');
            } else {
                process.stdout.write(out + '\n');
            }
            return;
        }

        // Development Terminal Output
        const timeStr = `${ANSI.gray}${new Date().toLocaleTimeString()}${ANSI.reset}`;
        const svcStr = `${ANSI.magenta}[${serviceName}]${ANSI.reset}`;
        
        let levelStr = `${ANSI.blue}INFO ${ANSI.reset}`;
        if (level === 'warn') levelStr = `${ANSI.yellow}WARN ${ANSI.reset}`;
        else if (level === 'error') levelStr = `${ANSI.red}ERROR${ANSI.reset}`;
        else if (level === 'debug') levelStr = `${ANSI.cyan}DEBUG${ANSI.reset}`;

        const metaStr = cleanMeta.length > 0 
            ? ` ${ANSI.dim}${cleanMeta.map(m => typeof m === 'object' ? JSON.stringify(m) : String(m)).join(' ')}${ANSI.reset}` 
            : '';

        const line = `${timeStr} ${svcStr} ${levelStr} ${ANSI.white}${message}${ANSI.reset}${metaStr}`;

        if (level === 'error') {
            process.stderr.write(`\n${ANSI.red}╔════════════════════ ERROR ════════════════════${ANSI.reset}\n${line}\n${ANSI.red}╚══════════════════════════════════════════════${ANSI.reset}\n\n`);
        } else {
            process.stdout.write(line + '\n');
        }
    };

    return {
        info: (msg: string, ...meta: unknown[]) => log('info', msg, meta),
        warn: (msg: string, ...meta: unknown[]) => log('warn', msg, meta),
        error: (msg: string, ...meta: unknown[]) => log('error', msg, meta),
        debug: (msg: string, ...meta: unknown[]) => log('debug', msg, meta),
    };
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
