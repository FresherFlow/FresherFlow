import Redis from 'ioredis';
import { env } from '@fresherflow/config';

type MinimalRedisLike = {
    options: {
        host?: string;
        port?: number;
        password?: string;
        username?: string;
        tls?: unknown;
    };
    on: (event: string, handler: (...args: unknown[]) => void) => MinimalRedisLike;
    get: (key: string) => Promise<string | null>;
    set: (...args: unknown[]) => Promise<'OK'>;
    setex: (key: string, seconds: number, value: string) => Promise<'OK'>;
    del: (...keys: string[]) => Promise<number>;
    keys: (pattern: string) => Promise<string[]>;
    scan: (cursor: string, ...args: unknown[]) => Promise<[string, string[]]>;
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<0 | 1>;
    pexpire: (key: string, milliseconds: number) => Promise<0 | 1>;
    pttl: (key: string) => Promise<number>;
    ping: () => Promise<string>;
    quit: () => Promise<'OK'>;
    disconnect: () => void;
};

const createTestRedisClient = (): MinimalRedisLike => {
    const store = new Map<string, string>();

    return {
        options: {
            host: '127.0.0.1',
            port: 6379,
        },
        on() {
            return this;
        },
        async ping() {
            return 'PONG';
        },
        async get(key: string) {
            return store.has(key) ? store.get(key)! : null;
        },
        async set(...args: unknown[]) {
            const [key, value] = args;
            store.set(String(key), String(value));
            return 'OK';
        },
        async setex(key: string, _seconds: number, value: string) {
            store.set(key, value);
            return 'OK';
        },
        async del(...keys: string[]) {
            let deleted = 0;
            for (const key of keys) {
                if (store.delete(key)) deleted += 1;
            }
            return deleted;
        },
        async keys(pattern: string) {
            if (!pattern.includes('*')) return store.has(pattern) ? [pattern] : [];
            const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
            return Array.from(store.keys()).filter((key) => regex.test(key));
        },
        async scan(cursor: string) {
            if (cursor === '0') {
                return ['0', Array.from(store.keys())];
            }
            return ['0', []];
        },
        async incr(key: string) {
            const val = parseInt(store.get(key) || '0', 10);
            const newVal = val + 1;
            store.set(key, String(newVal));
            return newVal;
        },
        async expire(key: string, _seconds: number) {
            return store.has(key) ? 1 : 0;
        },
        async pexpire(key: string, _milliseconds: number) {
            return store.has(key) ? 1 : 0;
        },
        async pttl(_key: string) {
            return 60000; // Mock 60s
        },
        async quit() {
            return 'OK';
        },
        disconnect() {
            store.clear();
        },
    };
};

const redisClientSingleton = () => {
    if (env.NODE_ENV === 'test') {
        return createTestRedisClient();
    }

    if (!env.REDIS_URL) {
        console.warn('[redis] REDIS_URL not set, using localhost:6379');
    }
    const client = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
    });

    client.on('connect', () => {
        console.log('[redis] connected');
    });

    client.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (env.NODE_ENV === 'production') {
            console.error('[redis] error:', message);
        } else {
            console.warn('[redis] Connection error (dev):', message);
        }
    });

    // Trigger connection manually since lazyConnect is true
    client.connect().catch(() => {});

    return client;
};

type RedisClientSingleton = ReturnType<typeof redisClientSingleton>;

const globalForRedis = globalThis as unknown as {
    redis: RedisClientSingleton | undefined;
};

const redis = globalForRedis.redis ?? redisClientSingleton();

export { redis };

if (env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
