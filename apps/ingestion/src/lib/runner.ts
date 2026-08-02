import { PLUGIN_REGISTRY } from '@fresherflow/plugins';
import { applyFilter } from './filter.js';
import { submitJobsToApi } from './api.js';
import { recordRun } from './stats.js';
import { withRetry } from './retry.js';

export interface RunTarget {
  ats: string;
  slug: string;
  company: string;
  filter?: boolean;
  hoursOld?: number;
  resultsWanted?: number;
  dryRun?: boolean;
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

export async function runTarget(target: RunTarget): Promise<RunResult> {
  const adapter = PLUGIN_REGISTRY[target.ats];
  const startTime = Date.now();

  if (!adapter) {
    return { 
      ats: target.ats, slug: target.slug, company: target.company, 
      total: 0, filtered: 0, saved: 0, skipped: 0, 
      durationMs: Date.now() - startTime, 
      status: 'ERROR', error: `Unknown ATS: ${target.ats}` 
    };
  }

  try {
    const fetchPromise = withRetry(() => adapter.fetchJobs(target.slug, target.company));
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 20000);
    });

    let raw = await Promise.race([fetchPromise, timeoutPromise]) as any[];
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
    
    const filtered = target.filter ? applyFilter(raw, target.hoursOld) : raw;
    
    if (target.dryRun) {
      recordRun(raw.length, 0, filtered.length, false);
      return {
        ats: target.ats, slug: target.slug, company: target.company,
        total: raw.length, filtered: filtered.length, saved: 0, skipped: filtered.length,
        durationMs: Date.now() - startTime, status: 'OK', jobs: filtered, dryRun: true
      };
    }

    const { saved, skipped } = await submitJobsToApi(filtered, target.company);
    recordRun(raw.length, saved, skipped, false);

    return { 
      ats: target.ats, slug: target.slug, company: target.company,
      total: raw.length, filtered: filtered.length, saved, skipped, 
      durationMs: Date.now() - startTime, status: 'OK' 
    };
  } catch (error) {
    recordRun(0, 0, 0, true);
    const isTimeout = (error as Error).message === 'TIMEOUT';
    return { 
      ats: target.ats, slug: target.slug, company: target.company, 
      total: 0, filtered: 0, saved: 0, skipped: 0, 
      durationMs: Date.now() - startTime, 
      status: isTimeout ? 'TIMEOUT' : 'ERROR', 
      error: (error as Error).message 
    };
  }
}
