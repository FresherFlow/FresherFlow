import { PLUGIN_REGISTRY } from '@fresherflow/plugins';
import { applyFilter } from './filter.js';
import { submitJobsToApi } from './api.js';
import { recordRun } from './stats.js';
import { withRetry } from './retry.js';
import { checkCache, setCache } from './cache.js';
import { redis } from '@fresherflow/redis';

export interface RunTarget {
  ats: string;
  slug: string;
  company: string;
  filter?: boolean;
  hoursOld?: number;
  resultsWanted?: number;
  dryRun?: boolean;
  noCache?: boolean;
  specificUrl?: string;
}

export interface RunResult {
  ats: string;
  slug: string;
  company: string;
  total: number;
  filtered: number;
  saved: number;
  skipped: number;
  durationMs: number;
  status: 'OK' | 'TIMEOUT' | 'ERROR';
  error?: string;
  jobs?: any[];
  dryRun?: boolean;
}

async function saveResultToRedis(target: RunTarget, result: RunResult): Promise<void> {
  const key = `ingestion:result:${target.ats}:${target.slug}`;
  try {
    // Store result in Redis with TTL of 24h (86400 seconds)
    await redis.setex(key, 86400, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to store job result in Redis:', e);
  }
}

export async function runTarget(target: RunTarget): Promise<RunResult> {
  const adapter = PLUGIN_REGISTRY[target.ats];
  const startTime = Date.now();

  if (!adapter) {
    const durationMs = Date.now() - startTime;
    await recordRun(0, 0, 0, true, durationMs, target);
    const result: RunResult = { 
      ats: target.ats, slug: target.slug, company: target.company, 
      total: 0, filtered: 0, saved: 0, skipped: 0, 
      durationMs: Date.now() - startTime, 
      status: 'ERROR', error: `Unknown ATS: ${target.ats}` 
    };
    await saveResultToRedis(target, result);
    return result;
  }

  const cachedJobs = await checkCache(target);
  if (cachedJobs && !target.dryRun) {
    // If we have cached jobs and this isn't a dry run, we still submit to API
    const filtered = target.filter !== false ? applyFilter(cachedJobs, target.hoursOld) : cachedJobs;
    const { saved, skipped } = await submitJobsToApi(filtered, target.company);
    const durationMs = Date.now() - startTime;
    await recordRun(cachedJobs.length, saved, skipped, false, durationMs, target);
    const result: RunResult = { 
      ats: target.ats, slug: target.slug, company: target.company,
      total: cachedJobs.length, filtered: filtered.length, saved, skipped, 
      durationMs: Date.now() - startTime, status: 'OK' 
    };
    await saveResultToRedis(target, result);
    return result;
  }

  try {
    const fetchPromise = withRetry(() => adapter.fetchJobs(target.slug, target.company));
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 20000);
    });

    let raw = await Promise.race([fetchPromise, timeoutPromise]) as any[];
    
    // If we only want a specific URL, filter down to it now before any further processing
    if (target.specificUrl) {
      raw = raw.filter(job => job.applyLink === target.specificUrl || target.specificUrl!.includes(job.applyLink) || job.applyLink.includes(target.specificUrl!));
    }

    if (target.resultsWanted && raw.length > target.resultsWanted) {
      raw = raw.slice(0, target.resultsWanted);
    }
    
    // Detail enrichment if adapter supports fetchJobDetails
    if (typeof adapter.fetchJobDetails === 'function' && Array.isArray(raw) && raw.length > 0) {
      const BATCH_SIZE = 5;
      for (let i = 0; i < raw.length; i += BATCH_SIZE) {
        const batch = raw.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (job) => {
            if (!job.description || job.description.length < 50) {
              try {
                const details = await adapter.fetchJobDetails!(job);
                if (details) job.description = details;
              } catch (e) {
                // Ignore individual detail fetch errors
              }
            }
          })
        );
      }
    }
    
    await setCache(target, raw);

    const filtered = target.filter !== false ? applyFilter(raw, target.hoursOld) : raw;
    
    if (target.dryRun) {
      const durationMs = Date.now() - startTime;
      await recordRun(raw.length, 0, filtered.length, false, durationMs, target);
      const result: RunResult = {
        ats: target.ats, slug: target.slug, company: target.company,
        total: raw.length, filtered: filtered.length, saved: 0, skipped: filtered.length,
        durationMs: Date.now() - startTime, status: 'OK', jobs: filtered, dryRun: true
      };
      await saveResultToRedis(target, result);
      return result;
    }

    const { saved, skipped } = await submitJobsToApi(filtered, target.company);
    const durationMs = Date.now() - startTime;
    await recordRun(raw.length, saved, skipped, false, durationMs, target);

    const result: RunResult = { 
      ats: target.ats, slug: target.slug, company: target.company,
      total: raw.length, filtered: filtered.length, saved, skipped, 
      durationMs: Date.now() - startTime, status: 'OK' 
    };
    await saveResultToRedis(target, result);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await recordRun(0, 0, 0, true, durationMs, target);
    const isTimeout = (error as Error).message === 'TIMEOUT';
    const result: RunResult = { 
      ats: target.ats, slug: target.slug, company: target.company, 
      total: 0, filtered: 0, saved: 0, skipped: 0, 
      durationMs: Date.now() - startTime, 
      status: isTimeout ? 'TIMEOUT' : 'ERROR', 
      error: (error as Error).message 
    };
    await saveResultToRedis(target, result);
    return result;
  }
}
