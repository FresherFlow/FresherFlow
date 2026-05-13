import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient();
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
