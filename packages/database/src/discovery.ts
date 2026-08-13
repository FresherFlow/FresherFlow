import { PrismaClient } from '@prisma/client';

const discoveryClientSingleton = () => {
    return new PrismaClient();
};

type DiscoveryClientSingleton = ReturnType<typeof discoveryClientSingleton>;

const globalForDiscovery = globalThis as unknown as {
    discoveryClient: DiscoveryClientSingleton | undefined;
};

export const discoveryClient = globalForDiscovery.discoveryClient ?? discoveryClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForDiscovery.discoveryClient = discoveryClient;
