import 'dotenv/config';
import './bootstrap'; // explicit processor registration: do not remove
import { Worker, Queue } from 'bullmq';
import {
    WORKER_DEFINITIONS,
    WORKER_QUEUE_NAMES,
    getQueueConnection,
} from '@fresherflow/queue';
import http from 'http';
import { logger, setupCleanLogging } from '@fresherflow/logger';

setupCleanLogging();

const connection = getQueueConnection();
const startedAt = new Date().toISOString();

logger.info('Starting FresherFlow Background Worker...');

// Per-queue concurrency — default 2; email/push can handle more concurrency.
const CONCURRENCY: Record<string, number> = {
    email: 5,
    push: 5,
    cron: 1,
    telegram: 2,
    ingestion: 2,
};

const workers = WORKER_DEFINITIONS.map(({ name, handler }) => ({
    name,
    worker: new Worker(
        name,
        async (job) => { await handler(job); },
        { connection, concurrency: CONCURRENCY[name] ?? 2 },
    ),
}));

// One Queue reference per name for health reporting (read-only, no processing)
const queues = WORKER_QUEUE_NAMES.map(name => ({ name, queue: new Queue(name, { connection }) }));

// Event listeners
for (const { name, worker } of workers) {
    worker.on('completed', (job) =>
        logger.info(`[${name}] job ${job.id} completed`, { queue: name, jobId: job.id }),
    );
    worker.on('failed', (job, err) =>
        logger.error(`[${name}] job ${job?.id} failed`, { queue: name, jobId: job?.id, error: err.message }),
    );
    worker.on('error', (err) =>
        logger.error(`[${name}] worker error`, { queue: name, error: err.message }),
    );
}

// Health endpoint — includes per-queue backlog and failed counts
// Required by Render to keep the free-tier web service alive.
const PORT = parseInt(process.env.PORT || '5001', 10);

http.createServer(async (_, res) => {
    try {
        const queueStats = await Promise.allSettled(
            queues.map(async ({ name, queue }) => {
                const [waiting, active, failed] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getFailedCount(),
                ]);
                return { name, waiting, active, failed };
            }),
        );

        const stats = queueStats.map((r) => {
            if (r.status === 'fulfilled') return r.value;
            logger.warn(`Failed to fetch stats for queue: ${r.reason?.message || 'unknown error'}`);
            return { name: 'unknown', error: r.reason?.message || 'unknown error' };
        });

        const totalFailed = stats.reduce((acc, s) => acc + (('failed' in s ? (s.failed as number) : 0)), 0);
        const totalWaiting = stats.reduce((acc, s) => acc + (('waiting' in s ? (s.waiting as number) : 0)), 0);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'fresherflow-worker',
            startedAt,
            uptime: Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
            summary: { totalWaiting, totalFailed },
            queues: stats,
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: err instanceof Error ? err.message : 'unknown' }));
    }
}).listen(PORT, () => {
    logger.info(`Worker health server listening on port ${PORT}`);
});

async function shutdown() {
    logger.info('Shutting down workers...');
    await Promise.all([
        ...workers.map(({ worker }) => worker.close()),
        ...queues.map(({ queue }) => queue.close()),
    ]);
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
