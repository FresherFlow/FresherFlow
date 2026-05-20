import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const prismaClientSingleton = () => {
    const shouldLog = process.env.LOG_DATABASE_QUERIES === 'true';
    const client = new PrismaClient(
        shouldLog
            ? {
                  log: [
                      { emit: 'event', level: 'query' },
                      { emit: 'stdout', level: 'error' },
                      { emit: 'stdout', level: 'warn' },
                  ],
              }
            : undefined
    );

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

const prisma = (() => {
    if (process.env.MAINTENANCE_MODE === 'true') {
        console.log('[database] MAINTENANCE_MODE is active. Prisma client will not be initialized.');
        return new Proxy({} as PrismaClientSingleton, {
            get() {
                throw new Error('Database access is disabled in MAINTENANCE_MODE');
            }
        });
    }
    return globalForPrisma.prisma ?? prismaClientSingleton();
})();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
