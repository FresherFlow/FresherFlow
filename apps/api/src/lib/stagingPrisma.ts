import { PrismaClient } from '@prisma/staging-client';

// Separate Prisma client connected to Supabase (staging DB).
// Used exclusively by the ingestion pipeline so that raw job
// data never touches the main Neon DB compute budget.

const stagingPrismaClientSingleton = () => {
    return new PrismaClient();
};

type StagingPrismaClientSingleton = ReturnType<typeof stagingPrismaClientSingleton>;

const globalForStagingPrisma = globalThis as unknown as {
    stagingPrisma: StagingPrismaClientSingleton | undefined;
};

const stagingPrisma = globalForStagingPrisma.stagingPrisma ?? stagingPrismaClientSingleton();

export default stagingPrisma;

if (process.env.NODE_ENV !== 'production') globalForStagingPrisma.stagingPrisma = stagingPrisma;
