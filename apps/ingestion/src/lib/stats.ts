import { loadDefaultTargets } from './targets.js';
import { redis } from '@fresherflow/database';
import { pool } from './db.js';

const START_TIME = Date.now();

export const IngestionStats = {
  totalRuns: 0,
  totalJobsIngested: 0,
  totalJobsSaved: 0,
  totalJobsSkipped: 0,
  totalErrors: 0,
  lastRunTimestamp: new Date().toISOString()
};

// Try loading cached stats from Redis on startup
try {
  redis.get('ingestion:stats:summary').then((cached: string | null) => {
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        IngestionStats.totalRuns = parsed.totalRuns || 0;
        IngestionStats.totalJobsIngested = parsed.totalJobsIngested || 0;
        IngestionStats.totalJobsSaved = parsed.totalJobsSaved || 0;
        IngestionStats.totalJobsSkipped = parsed.totalJobsSkipped || 0;
        IngestionStats.totalErrors = parsed.totalErrors || 0;
        if (parsed.lastRunTimestamp) IngestionStats.lastRunTimestamp = parsed.lastRunTimestamp;
      } catch (e) {}
    }
  }).catch(() => {});
} catch (e) {}

export function getStats() {
  return {
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    totalRuns: IngestionStats.totalRuns,
    totalJobsIngested: IngestionStats.totalJobsIngested,
    totalJobsSaved: IngestionStats.totalJobsSaved,
    totalJobsSkipped: IngestionStats.totalJobsSkipped,
    totalErrors: IngestionStats.totalErrors,
    lastRunTimestamp: IngestionStats.lastRunTimestamp
  };
}

export async function getSummaryStats() {
  const defaultTargets = await loadDefaultTargets();

  let redisStats: Partial<typeof IngestionStats> = {};
  try {
    const cached = await redis.get('ingestion:stats:summary');
    if (cached) {
      redisStats = JSON.parse(cached);
    }
  } catch (e) {
    // Ignore Redis errors
  }

  const totalRuns = redisStats.totalRuns ?? IngestionStats.totalRuns;
  const totalJobsIngested = redisStats.totalJobsIngested ?? IngestionStats.totalJobsIngested;
  const totalJobsSaved = redisStats.totalJobsSaved ?? IngestionStats.totalJobsSaved;
  const totalJobsSkipped = redisStats.totalJobsSkipped ?? IngestionStats.totalJobsSkipped;
  const lastRunAt = redisStats.lastRunTimestamp ?? IngestionStats.lastRunTimestamp;

  return {
    totalTargets: defaultTargets.length,
    totalJobsIngested,
    totalJobsSaved,
    totalJobsSkipped,
    totalRuns,
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    lastRunAt,
    engineVersion: '1.0.0'
  };
}

export async function recordRun(total: number, saved: number, skipped: number, hasError: boolean, durationMs: number = 0, targetInfo: any = null) {
  IngestionStats.totalRuns += 1;
  IngestionStats.totalJobsIngested += total;
  IngestionStats.totalJobsSaved += saved;
  IngestionStats.totalJobsSkipped += skipped;
  if (hasError) IngestionStats.totalErrors += 1;
  const now = new Date().toISOString();
  IngestionStats.lastRunTimestamp = now;

  try {
    await pool.query(`
      INSERT INTO discovery_runs (
        duration_ms, total_found, accepted, failed, status, completed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [
      durationMs,
      total,
      saved,
      hasError ? 1 : 0,
      hasError ? 'FAILED' : 'COMPLETED',
      targetInfo ? JSON.stringify(targetInfo) : null
    ]);
  } catch (e) {
    console.error('Failed to save run to db', e);
  }

  try {
    redis.set('ingestion:stats:summary', JSON.stringify({
      totalRuns: IngestionStats.totalRuns,
      totalJobsIngested: IngestionStats.totalJobsIngested,
      totalJobsSaved: IngestionStats.totalJobsSaved,
      totalJobsSkipped: IngestionStats.totalJobsSkipped,
      totalErrors: IngestionStats.totalErrors,
      lastRunTimestamp: IngestionStats.lastRunTimestamp
    })).catch(() => {});
  } catch (e) {}
}

