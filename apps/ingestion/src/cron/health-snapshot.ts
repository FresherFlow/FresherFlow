import { getQueue, QUEUE_NAMES } from '@fresherflow/queue';
import { circuitBreaker } from '../lib/circuit-breaker.js';

export async function processHealthSnapshot() {
  try {
    const snapshots = circuitBreaker.list();
    if (snapshots.length === 0) {
      return { persisted: true, inserted: 0 };
    }
    
    console.log(`[HealthSnapshot] Persisting ${snapshots.length} circuit breaker stats (mock logic)`);
    // NOTE: In full integration, we would import the DB or API and persist these stats.
    
    return { persisted: true, inserted: snapshots.length };
  } catch (err: any) {
    console.warn(`[HealthSnapshot] Error during snapshot: ${err.message}`);
    return { persisted: false, reason: 'error', error: err.message };
  }
}

export async function registerHealthSnapshotCron() {
  const queue = getQueue(QUEUE_NAMES.scraper);
  await (queue.add as any)(
    'health-snapshot',
    { scheduled: true },
    {
      repeat: { every: 60000 },
      jobId: 'health-snapshot-cron',
    }
  );
  console.log('[ingestion] Scheduled health-snapshot every 60s');
}
