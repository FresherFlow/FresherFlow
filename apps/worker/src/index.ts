import 'dotenv/config';
import './bootstrap'; // explicit processor registration: do not remove
import { Worker } from 'bullmq';
import {
    WORKER_DEFINITIONS,
    WORKER_QUEUE_NAMES,
    getQueueConnection,
    getQueue,
} from '@fresherflow/queue';
import http from 'http';
import { env } from '@fresherflow/config';
import { logger, setupCleanLogging } from '@fresherflow/logger';
import { redis } from '@fresherflow/redis';
import { handleSend, handlePlatforms, handleSchedule, handleCancelSchedule, isAuthorized } from './social.handler';

setupCleanLogging();

const connection = getQueueConnection();
const startedAt = new Date().toISOString();
const ENABLE_QUEUE_HEALTH = env.ENABLE_WORKER_QUEUE_HEALTH;
const ENABLE_DEEP_HEALTH = ['true', '1', 'yes', 'on'].includes(
    String(process.env.ENABLE_WORKER_DEEP_HEALTH || '').trim().toLowerCase()
);

logger.info('Starting FresherFlow Background Worker...');

// Per-queue concurrency — default 2; email/push can handle more concurrency.
const CONCURRENCY: Record<string, number> = {
    notifications: 10,
    broadcast: 5,
    internal: 2,
};

const workers = env.REDIS_ENABLED !== false
    ? WORKER_DEFINITIONS.map(({ name, handler }) => ({
        name,
        worker: new Worker(
            name,
            async (job) => { await handler(job); },
            { connection, concurrency: CONCURRENCY[name] ?? 2 },
        ),
    }))
    : [];

if (env.REDIS_ENABLED === false) {
    logger.warn('Redis is disabled. Workers will not be started.');
}

// Health reporting will use getQueue(name) lazily to minimize Redis connections

// Event listeners
for (const { name, worker } of workers) {
    worker.on('completed', (job) =>
        logger.info(`[${name}] job ${job.id} completed`, { queue: name, jobId: job.id }),
    );
    worker.on('failed', (job, err) => {
        const attemptsMade = job?.attemptsMade ?? 0;
        const maxAttempts = job?.opts?.attempts ?? 1;
        const isDeadLetter = attemptsMade >= maxAttempts;

        if (isDeadLetter) {
            logger.error(`[${name}] [DLQ] job ${job?.id} permanently failed after ${attemptsMade} attempts`, {
                queue: name,
                jobId: job?.id,
                jobName: job?.name,
                data: job?.data,
                error: err.message,
                stack: err.stack,
            });
        } else {
            logger.warn(`[${name}] job ${job?.id} failed (attempt ${attemptsMade}/${maxAttempts})`, {
                queue: name,
                jobId: job?.id,
                error: err.message,
            });
        }
    });
    worker.on('error', (err) =>
        logger.error(`[${name}] worker error`, { queue: name, error: err.message }),
    );
}

// Render only needs a fast 200 response. Keep root health zero-DB by default
// so periodic health checks do not keep Neon compute awake.
const PORT = parseInt(env.PORT || '5001', 10);

http.createServer(async (req, res) => {
    try {
        const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

        if (requestUrl.pathname === '/' || requestUrl.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'fresherflow-worker',
                startedAt,
                uptime: Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
                deepHealthEnabled: ENABLE_DEEP_HEALTH,
            }));
            return;
        }


        if (req.method === 'GET' && requestUrl.pathname === '/social/platforms') {
            if (!isAuthorized(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            handlePlatforms(res);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/social/send') {
            if (!isAuthorized(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            await handleSend(req, res);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/social/schedule') {
            if (!isAuthorized(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            await handleSchedule(req, res);
            return;
        }

        if (req.method === 'DELETE' && requestUrl.pathname === '/social/schedule') {
            if (!isAuthorized(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            await handleCancelSchedule(req, res);
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        const queueStats = ENABLE_QUEUE_HEALTH
            ? await Promise.allSettled(
                WORKER_QUEUE_NAMES.map(async (name) => {
                    const queue = getQueue(name);
                    const [waiting, active, failed] = await Promise.all([
                        queue.getWaitingCount(),
                        queue.getActiveCount(),
                        queue.getFailedCount(),
                    ]);
                    return { name, waiting, active, failed };
                }),
            )
            : [];

        const stats = ENABLE_QUEUE_HEALTH
            ? queueStats.map((result) => {
                if (result.status === 'fulfilled') return result.value;
                logger.warn(`Failed to fetch stats for queue: ${result.reason?.message || 'unknown error'}`);
                return { name: 'unknown', error: result.reason?.message || 'unknown error' };
            })
            : [];

        const totalFailed = stats.reduce((acc, stat) => acc + (('failed' in stat ? (stat.failed as number) : 0)), 0);
        const totalWaiting = stats.reduce((acc, stat) => acc + (('waiting' in stat ? (stat.waiting as number) : 0)), 0);

        const redisStatus = await Promise.allSettled([
            redis.ping(),
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'fresherflow-worker',
            startedAt,
            uptime: Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
            health: {
                database: 'skipped',
                redis: redisStatus[0]?.status === 'fulfilled' ? 'connected' : 'disconnected',
            },
            summary: { totalWaiting, totalFailed },
            queueHealthEnabled: ENABLE_QUEUE_HEALTH,
            queues: stats,
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: err instanceof Error ? err.message : 'unknown' }));
    }
}).listen(PORT, () => {
    logger.info(`Worker health server listening on port ${PORT}`);
});

let isShuttingDown = false;

async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Shutting down background workers gracefully...');

    const SHUTDOWN_TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => {
            logger.warn(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
            resolve('TIMEOUT');
        }, SHUTDOWN_TIMEOUT_MS)
    );

    const closeWorkersPromise = Promise.allSettled(
        workers.map(async ({ name, worker }) => {
            logger.info(`Closing worker [${name}]...`);
            await worker.close();
            logger.info(`Worker [${name}] closed successfully.`);
        })
    );

    await Promise.race([closeWorkersPromise, timeoutPromise]);
    logger.info('Worker shutdown complete. Exiting process.');
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

