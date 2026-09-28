import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

export * from '@prisma/client';
export * from './redis.js';

const parsePoolInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const prismaClientSingleton = () => {
    const shouldLog = process.env.LOG_DATABASE_QUERIES === 'true';
    // Never disable TLS verification by default. Managed Postgres providers
    // should be configured via `?sslmode=require` in DATABASE_URL; an explicit
    // opt-out remains available for local/dev proxies via PG_SSL_REJECT_UNAUTHORIZED=0.
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Explicit, env-overridable pool sizing with safe defaults.
        max: parsePoolInt(process.env.PGPOOL_MAX, 10),
        min: parsePoolInt(process.env.PGPOOL_MIN, 2),
        idleTimeoutMillis: parsePoolInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30000),
        connectionTimeoutMillis: parsePoolInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 5000),
        statement_timeout: parsePoolInt(process.env.PG_STATEMENT_TIMEOUT_MS, 15000),
        ssl:
            process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== '0' }
                : undefined,
    });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({
        adapter,
        ...(shouldLog
            ? {
                  log: [
                      { emit: 'event', level: 'query' },
                      { emit: 'stdout', level: 'error' },
                      { emit: 'stdout', level: 'warn' },
                  ],
              }
            : {}),
    });

    if (shouldLog) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any).$on('query', (e: any) => {
            console.log(`[Prisma Query] [${new Date().toISOString()}] ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
        });
    }

    return client;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

let _prismaInstance: PrismaClientSingleton | undefined;

function getPrismaClient(): PrismaClientSingleton {
    if (process.env.MAINTENANCE_MODE === 'true') {
        console.log('[database] MAINTENANCE_MODE is active. Prisma client will not be initialized.');
        return new Proxy({} as PrismaClientSingleton, {
            get() {
                throw new Error('Database access is disabled in MAINTENANCE_MODE');
            }
        });
    }
    if (!_prismaInstance) {
        _prismaInstance = globalForPrisma.prisma ?? prismaClientSingleton();
        if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prismaInstance;
    }
    return _prismaInstance;
}

const prisma = new Proxy({} as PrismaClientSingleton, {
    get(_target, prop, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === 'function' ? value.bind(client) : value;
    }
});

export { prisma };
export default prisma;
