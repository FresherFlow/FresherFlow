import 'dotenv/config';
import './bootstrap'; // explicit processor registration — do not remove
import { Worker } from 'bullmq';
import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';
import { setupSearchIndex } from '@fresherflow/search';
import {
    processEmailJob,
    processCronJob,
    processPushJob,
    processTelegramJob,
    processSearchJob,
    processIngestionJob,
} from '@fresherflow/queue';

const connection = {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
    username: redis.options.username,
    tls: redis.options.tls,
};

logger.info('Starting FresherFlow Background Worker...');

// Ensure Meilisearch indices exist on boot
setupSearchIndex().catch((err: any) => {
    logger.error('Failed to setup search index on boot:', err);
});

// Workers
const emailWorker = new Worker('email', async (job) => { await processEmailJob(job); }, { connection });
const cronWorker = new Worker('cron', async (job) => { await processCronJob(job); }, { connection });
const pushWorker = new Worker('push', async (job) => { await processPushJob(job); }, { connection });
const telegramWorker = new Worker('telegram', async (job) => { await processTelegramJob(job); }, { connection });
const searchWorker = new Worker('search', async (job) => { await processSearchJob(job); }, { connection });
const ingestionWorker = new Worker('ingestion', async (job) => { await processIngestionJob(job); }, { connection });

// Event listeners
for (const [name, worker] of [
    ['email', emailWorker],
    ['cron', cronWorker],
    ['push', pushWorker],
    ['telegram', telegramWorker],
    ['search', searchWorker],
    ['ingestion', ingestionWorker],
] as const) {
    worker.on('completed', (job) => logger.info(`[${name}] job ${job.id} completed`));
    worker.on('failed', (job, err) => logger.error(`[${name}] job ${job?.id} failed: ${err.message}`));
}

async function shutdown() {
    logger.info('Shutting down workers...');
    await Promise.all([
        emailWorker.close(),
        cronWorker.close(),
        pushWorker.close(),
        telegramWorker.close(),
        searchWorker.close(),
        ingestionWorker.close(),
    ]);
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
