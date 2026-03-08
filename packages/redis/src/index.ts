import Redis from 'ioredis';

const redisClientSingleton = () => {
    if (!process.env.REDIS_URL) {
        console.warn('[redis] REDIS_URL not set, using localhost:6379');
    }
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
    });

    client.on('error', (err) => {
        // Suppress connection errors in dev — don't crash the process
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[redis] Connection error (dev):', err.message);
        }
    });

    return client;
};

type RedisClientSingleton = ReturnType<typeof redisClientSingleton>;

const globalForRedis = globalThis as unknown as {
    redis: RedisClientSingleton | undefined;
};

const redis = globalForRedis.redis ?? redisClientSingleton();

export { redis };

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
