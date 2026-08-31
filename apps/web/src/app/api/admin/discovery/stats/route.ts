import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { hasIngestionDb, queryRows, ingestionDbError } from '@/lib/ingestion/db';
import { loadDefaultTargets } from '@/lib/ingestion/targets';

export const dynamic = 'force-dynamic';

interface IngestionCountsRow {
  discovered: string;
  processed: string;
  runs: string;
  skipped: string;
  lastRunAt: Date | null;
}

async function getStats(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const [counts] = await queryRows<IngestionCountsRow>(
      `SELECT
        (SELECT COUNT(*) FROM discovered_jobs) AS discovered,
        (SELECT COUNT(*) FROM processed_jobs) AS processed,
        (SELECT COUNT(*) FROM discovery_runs) AS runs,
        (SELECT COALESCE(SUM(duplicates), 0) FROM discovery_runs) AS skipped,
        (SELECT MAX(started_at) FROM discovery_runs) AS last_run_at`
    );
    const totalTargets = await loadDefaultTargets();

    return NextResponse.json({
      totalTargets: totalTargets.length,
      totalJobsIngested: Number(counts?.discovered ?? 0),
      totalJobsSaved: Number(counts?.processed ?? 0),
      totalJobsSkipped: Number(counts?.skipped ?? 0),
      totalRuns: Number(counts?.runs ?? 0),
      uptimeSeconds: 0,
      lastRunAt: counts?.lastRunAt ? new Date(counts.lastRunAt).toISOString() : null,
      engineVersion: '1.0.0'
    });
  } catch {
    return ingestionDbError();
  }
}

export const GET = withRateLimit(getStats, { windowMs: 60_000, max: 60, keyPrefix: 'discovery-stats' });