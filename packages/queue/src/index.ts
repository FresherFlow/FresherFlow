import { Queue, ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { redis } from '@fresherflow/redis';
import { processEmailJob } from './processors/email.processor';
import { processCronJob } from './processors/cron.processor';
import { processPushJob } from './processors/push.processor';
import { processTelegramJob } from './processors/telegram.processor';
import { processIngestionJob } from './processors/ingestion.processor';

export const QUEUE_NAMES = {
    email: 'email',
    cron: 'cron',
    push: 'push',
    telegram: 'telegram',
    ingestion: 'ingestion',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export const WORKER_QUEUE_NAMES: QueueName[] = [
    QUEUE_NAMES.email,
    QUEUE_NAMES.cron,
    QUEUE_NAMES.push,
    QUEUE_NAMES.telegram,
    QUEUE_NAMES.ingestion,
];

const connection: RedisOptions = {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
    username: redis.options.username,
    tls: redis.options.tls as RedisOptions['tls'],
};

export function getQueueConnection(): ConnectionOptions {
    return { ...connection } as ConnectionOptions;
}

type MinimalQueue = {
    add: (name: string, data: unknown, opts?: unknown) => Promise<{ id: string }>;
    close: () => Promise<void>;
};

function createNoopQueue(queueName: string): MinimalQueue {
    return {
        async add(_name: string, _data: unknown, _opts?: unknown) {
            return { id: `test-${queueName}` };
        },
        async close() {
            return;
        },
    };
}

const createQueue = (queueName: QueueName) =>
    process.env.NODE_ENV === 'test'
        ? createNoopQueue(queueName)
        : new Queue(queueName, { connection });

// Queue Definitions
export const emailQueue = createQueue(QUEUE_NAMES.email);
export const cronQueue = createQueue(QUEUE_NAMES.cron);
export const pushQueue = createQueue(QUEUE_NAMES.push);
export const telegramQueue = createQueue(QUEUE_NAMES.telegram);

export const ingestionQueue = createQueue(QUEUE_NAMES.ingestion);

// Export Processors
export * from './processors/email.processor';
export * from './processors/cron.processor';
export * from './processors/push.processor';
export * from './processors/telegram.processor';

export * from './processors/ingestion.processor';

export const WORKER_DEFINITIONS = [
    {
        name: QUEUE_NAMES.email,
        handler: processEmailJob,
    },
    {
        name: QUEUE_NAMES.cron,
        handler: processCronJob,
    },
    {
        name: QUEUE_NAMES.push,
        handler: processPushJob,
    },
    {
        name: QUEUE_NAMES.telegram,
        handler: processTelegramJob,
    },
    {
        name: QUEUE_NAMES.ingestion,
        handler: processIngestionJob,
    },
] as const;

// Export Producers
export * from './producers/email.producer';
export * from './producers/cron.producer';
export * from './producers/push.producer';
export * from './producers/telegram.producer';

export * from './producers/ingestion.producer';

// Job Data Types
// ... existing generic jobs ...
export interface EmailJobData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface CronJobData {
    task: 'EXPIRY_CHECK' | 'LINK_VERIFICATION' | 'ALERTS_CYCLE';
}

export interface PushJobData {
    endpoint: string;
    p256dh: string;
    auth: string;
    userId: string;
    title: string;
    body: string;
    url: string;
    kind: string;
    opportunityId: string;
    platform?: 'expo' | 'web';
}

export interface TelegramJobData {
    botToken: string;
    channelId: string;
    message: string;
    opportunityId: string;
    dedupeKey: string;
    publicChannel: string;
}
