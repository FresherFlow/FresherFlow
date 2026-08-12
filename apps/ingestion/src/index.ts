import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import runRouter from './routes/run.js';
import pluginsRouter from './routes/plugins.js';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';
import statsRouter from './routes/stats.js';
import targetsRouter from './routes/targets.js';
import dataRouter from './routes/data.js';
import searchRouter from './routes/search.js';
import { Worker } from 'bullmq';
import { getQueueConnection, getQueue, QUEUE_NAMES } from '@fresherflow/queue';
import { redis } from '@fresherflow/redis';
import { runTarget, RunTarget } from './lib/runner.js';
import { loadDefaultTargets } from './lib/targets.js';
import { applyPluginPolicies } from './lib/plugin-policy.js';
import { circuitBreaker, bindCircuitBreakerMetrics } from './lib/circuit-breaker.js';
import { registerHealthSnapshotCron, processHealthSnapshot } from './cron/health-snapshot.js';

const app = express();
app.set('trust proxy', 1); // Trust Render's reverse proxy for rate limiting
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    plugins: Object.keys(PLUGIN_REGISTRY).length
  });
});

app.get('/health/detailed', async (_req, res) => {
  let redisStatus = 'disconnected';
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      redisStatus = 'connected';
    }
  } catch (e) {
    redisStatus = 'disconnected';
  }

  let queueCounts = { waiting: 0, active: 0, completed: 0, failed: 0 };
  try {
    const queue = getQueue(QUEUE_NAMES.scraper);
    if (typeof queue.getJobCounts === 'function') {
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
      queueCounts = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      };
    }
  } catch (e) {
    // default fallback counts
  }

  res.json({
    status: 'healthy',
    plugins: Object.keys(PLUGIN_REGISTRY).length,
    uptime: Math.floor(process.uptime()),
    queue: queueCounts,
    redis: redisStatus,
    version: '1.0.0'
  });
});

app.use('/plugins', pluginsRouter);
app.use('/run', runRouter);
app.use('/stats', statsRouter);
app.use('/targets', targetsRouter);
app.use('/data', dataRouter);
app.use('/search', searchRouter);

const server = app.listen(port, () => {
  console.log(`Ingestion service listening on port ${port}`);
});

// Schedule auto-run every 6 hours
if (process.env.REDIS_ENABLED !== 'false') {
  applyPluginPolicies();
  bindCircuitBreakerMetrics();



  await registerHealthSnapshotCron();

  const scraperWorker = new Worker(QUEUE_NAMES.scraper, async (job) => {

    if (job.name === 'health-snapshot') {
      return await processHealthSnapshot();
    }
    
    console.log(`[Worker] Processing job ${job.id} for target: ${job.data.company}`);
    if (circuitBreaker.isOpen(job.data.company)) {
      console.warn(`[Worker] Circuit open for ${job.data.company}, skipping job.`);
      return { status: 'SKIPPED_CIRCUIT_OPEN' };
    }
    try {
      const res = await runTarget(job.data as RunTarget);
      circuitBreaker.recordSuccess(job.data.company);
      return res;
    } catch (e) {
      circuitBreaker.recordFailure(job.data.company);
      throw e;
    }
  }, {
    connection: getQueueConnection(),
    concurrency: parseInt(process.env.SCRAPER_CONCURRENCY || '5', 10),
    limiter: {
      max: 2,
      duration: 5000
    }
  });

  scraperWorker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job?.id} completed with result:`, result);
  });

  scraperWorker.on('failed', (job, err) => {
    console.error(`Scraper job ${job?.id} failed:`, err);
  });
} else {
  console.log('[ingestion] Redis disabled (REDIS_ENABLED=false). Worker and queue scheduler skipped.');
}

server.setTimeout(120000);
