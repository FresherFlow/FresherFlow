import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

export * from '@prisma/client';

const prismaClientSingleton = () => {
    const shouldLog = process.env.LOG_DATABASE_QUERIES === 'true';
    const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
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
