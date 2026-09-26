import { Queue, ConnectionOptions, Job, UnrecoverableError } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { redis } from '@fresherflow/database';
import { env } from '@fresherflow/utils';
import { logger } from '@fresherflow/utils';
import { processEmailJob } from './processors/email.processor';
import { processCronJob } from './processors/cron.processor';
import { processPushJob } from './processors/push.processor';
import { processTelegramJob } from './processors/telegram.processor';
import { processSocialJob, postToX, postToLinkedIn } from './processors/social.processor';
import { processIngestionJob } from './processors/ingestion.processor';
import { processCacheRevalidateJob } from './processors/revalidate.processor';
import { logJobFailure } from './observability';

// Reduced queue surfaces to save Redis connections (Redis Connection Fix Plan #5)
export const QUEUE_NAMES = {
    notifications: 'notifications', // combines email, push
    broadcast: 'broadcast',       // combines telegram, social
    internal: 'internal',         // combines cron, ingestion
    scraper: 'scraper',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export const WORKER_QUEUE_NAMES: QueueName[] = [
    QUEUE_NAMES.notifications,
    QUEUE_NAMES.broadcast,
    QUEUE_NAMES.internal,
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

/**
 * PHASE 19b — retry policy.
 *
 * WHY: previously every queue set `removeOnComplete`/`removeOnFail` but no
 * `attempts` and no `backoff`, so BullMQ's default of a single attempt meant one
 * transient SMTP rejection or one socket timeout killed the job permanently and
 * silently. Five attempts with exponential backoff (5s -> 10s -> 20s -> 40s,
 * plus BullMQ's automatic jitter) rides out a provider blip or a rolling
 * restart while still giving up in well under the `removeOnFail: 1000`
 * retention window's worth of wall clock (~75s worst case), so alerting still
 * sees the job fail in a reasonable timeframe.
 *
 * WHY these values: 5 attempts is enough to cover a 1-2 minute provider
 * incident without meaningfully increasing load on a genuinely broken job. The
 * 5s base keeps the first retry inside the 15s HTTP timeouts used by the
 * processors, so a retry never overlaps the previous socket teardown.
 * `removeOnComplete: true` and `removeOnFail: 1000` are preserved unchanged so
 * the existing Redis memory budget and failure-retention behaviour do not
 * change.
 */
export const QUEUE_DEFAULT_JOB_OPTIONS = {
    removeOnComplete: true,
    removeOnFail: 1000,
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 5000 },
};

function createNoopQueue(queueName: string): MinimalQueue {
    return {
        async add() {
            return { id: `test-${queueName}` };
        },
        async close() {
            return;
        },
    };
}

const queueCache: Partial<Record<QueueName, Queue | MinimalQueue>> = {};

export function getQueue(queueName: QueueName): Queue {
    if (queueCache[queueName]) {
        return queueCache[queueName] as Queue;
    }

    const instance = (env.NODE_ENV === 'test' || env.REDIS_ENABLED === false)
        ? createNoopQueue(queueName)
        : new Queue(queueName, {
            connection,
            defaultJobOptions: QUEUE_DEFAULT_JOB_OPTIONS,
        });

    queueCache[queueName] = instance;
    return instance as Queue;
}

/**
 * COMPATIBILITY PROXIES
 * These allow producers to keep using emailQueue.add() while the underlying
 * data is routed to consolidated queues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emailQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.notifications).add(n || 'send-email', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pushQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.notifications).add(n || 'send-push', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const telegramQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.broadcast).add(n || 'send-telegram', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const socialQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.broadcast).add(n || 'process-social-post', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cronQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.internal).add(n || 'cron-task', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ingestionQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.internal).add(n || 'ingestion-payload', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cacheRevalidateQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.internal).add(n || 'cache-revalidate', d, o) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const scraperQueue = { add: (n: string, d: any, o?: any) => getQueue(QUEUE_NAMES.scraper).add(n || 'run-target', d, o) };

export async function enqueueIngestionPayload(payload: Record<string, unknown>) {
    await ingestionQueue.add('ingestion-payload', payload);
}

// Export Processors
export * from './observability';
export * from './processors/email.processor';
export * from './processors/cron.processor';
export * from './processors/push.processor';
export * from './processors/telegram.processor';
export * from './processors/ingestion.processor';
export * from './processors/social.processor';
export * from './processors/revalidate.processor';
export * from './processors/scraper.processor';

/**
 * CONSOLIDATED WORKER DISPATCHERS
 * One worker per connection surface.
 */
export const WORKER_DEFINITIONS_BASE = [
    {
        name: QUEUE_NAMES.notifications,
        handler: async (job: Job) => {
            if (job.name === 'send-email') return processEmailJob(job);
            if (job.name === 'send-push') {
                if (!env.ENABLE_PUSH_NOTIFICATIONS) {
                    logger.info('[notifications] Push notifications disabled. Skipping...');
                    return;
                }
                return processPushJob(job);
            }
            throw new Error(`[notifications] Unknown job name: ${job.name}`);
        },
    },
    {
        name: QUEUE_NAMES.broadcast,
        handler: async (job: Job) => {
            if (job.name === 'send-telegram') {
                if (!env.ENABLE_TELEGRAM_BROADCAST) {
                    logger.info('[broadcast] Telegram broadcast disabled. Skipping...');
                    return;
                }
                return processTelegramJob(job);
            }
            if (job.name === 'process-social-post') {
                if (!env.ENABLE_SOCIAL_POSTING) {
                    logger.info('[broadcast] Social posting disabled. Skipping...');
                    return;
                }
                return processSocialJob(job);
            }
            if (job.name === 'scheduled-social') {
                const { platform, text } = job.data as ScheduledSocialJobData;
                logger.info('[broadcast] Firing scheduled social post', { platform });
                return processScheduledSocialJob(platform, text);
            }
            throw new Error(`[broadcast] Unknown job name: ${job.name}`);
        },
    },
    {
        name: QUEUE_NAMES.internal,
        handler: async (job: Job) => {
            if (job.name === 'cron-task') {
                if (!env.ENABLE_CRON_TASKS) {
                    logger.info('[internal] Cron tasks disabled. Skipping...');
                    return;
                }
                return processCronJob(job);
            }
            if (job.name === 'ingestion-payload' || job.name === 'process-user-share') {
                if (!env.ENABLE_INGESTION) {
                    logger.info('[internal] Ingestion disabled. Skipping...');
                    return;
                }
                return processIngestionJob(job);
            }
            if (job.name === 'cache-revalidate') {
                return processCacheRevalidateJob(job);
            }
            throw new Error(`[internal] Unknown job name: ${job.name}`);
        },
    },
] as const;

/**
 * PHASE 19b — failure visibility wrapper.
 *
 * WHY wrap here rather than in each processor: the processors are owned by other
 * agents and must not be edited. Wrapping at the single dispatch boundary
 * guarantees every job, including a new one added later, gets the same redacted
 * failure log without anyone remembering to add it.
 */
export const WORKER_DEFINITIONS = WORKER_DEFINITIONS_BASE.map((definition) => ({
    name: definition.name,
    handler: async (job: Job) => {
        try {
            return await definition.handler(job);
        } catch (error) {
            const descriptor = logJobFailure({ queue: definition.name, job, error });
            if (descriptor.category === 'permanent') {
                // A permanent failure will never succeed on retry, so fail fast
                // instead of burning four more attempts on a known-bad job.
                // The message is a fixed string: the original error text may
                // contain PII and must never be copied into a job record.
                throw new UnrecoverableError(`Permanent failure in queue ${definition.name}`);
            }
            throw error;
        }
    },
}));

// Export Producers
export * from './producers/email.producer';
export * from './producers/cron.producer';
export * from './producers/push.producer';
export * from './producers/telegram.producer';
export * from './producers/ingestion.producer';
export * from './producers/social.producer';
export * from './producers/revalidate.producer';

// Job Data Types
export interface EmailJobData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface CronJobData {
    task: 'EXPIRY_CHECK' | 'LINK_VERIFICATION' | 'ALERTS_CYCLE';
}

export interface CacheRevalidateJobData {
    paths: string[];
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

export interface SocialJobData {
    socialPostId: string;
}

export interface ScheduledSocialJobData {
    platform: 'telegram' | 'x' | 'linkedin';
    text: string;
}

// ─── Scheduled social post processor ─────────────────────────────────────────
async function processScheduledSocialJob(platform: string, text: string): Promise<void> {
    if (platform === 'telegram') {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const channel = process.env.TELEGRAM_PUBLIC_CHANNEL;
        if (!botToken || !channel) throw new Error('Telegram not configured');
        const axios = (await import('axios')).default;
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: channel, text, parse_mode: 'HTML', disable_web_page_preview: false,
        }, { timeout: 15000 });
    } else if (platform === 'x') {
        await postToX(text);
    } else if (platform === 'linkedin') {
        await postToLinkedIn(text, true);
    } else {
        throw new Error(`Unknown platform: ${platform}`);
    }
}
