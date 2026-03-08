import { Queue, ConnectionOptions } from 'bullmq';
import { redis } from '@fresherflow/redis';

const connection: ConnectionOptions = {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
    username: redis.options.username,
    tls: redis.options.tls,
};

// Queue Definitions
export const emailQueue = new Queue('email', { connection });
export const cronQueue = new Queue('cron', { connection });
export const pushQueue = new Queue('push', { connection });
export const telegramQueue = new Queue('telegram', { connection });
export const searchQueue = new Queue('search', { connection });
export const ingestionQueue = new Queue('ingestion', { connection });

// Export Processors
export * from './processors/email.processor';
export * from './processors/cron.processor';
export * from './processors/push.processor';
export * from './processors/telegram.processor';
export * from './processors/search.processor';
export * from './processors/ingestion.processor';

// Export Producers
export * from './producers/email.producer';
export * from './producers/cron.producer';
export * from './producers/push.producer';
export * from './producers/telegram.producer';
export * from './producers/search.producer';
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
}

export interface TelegramJobData {
    botToken: string;
    channelId: string;
    message: string;
    opportunityId: string;
    dedupeKey: string;
    publicChannel: string;
}

export interface SearchIndexJobData {
    action: 'UPSERT' | 'DELETE';
    opportunity: {
        id: string;
        title?: string;
        company?: string;
        description?: string;
        role?: string[];
        locations?: string[];
        skills?: string[];
        allowedPassoutYears?: number[];
        academicDegrees?: string[];
        type?: string;
        createdAt?: number;
        deadline?: number | null;
    };
}
