import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { hasIngestionDb, queryRows, ingestionDbError } from '@/lib/ingestion/db';

export const dynamic = 'force-dynamic';

interface DiscoveryRunRow {
  id: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  totalFound: number | null;
  accepted: number | null;
  reviewRequired: number | null;
  duplicates: number | null;
  failed: number | null;
  status: string | null;
}

async function getRuns(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const runs = await queryRows<DiscoveryRunRow>(
      'SELECT id, started_at as "startedAt", completed_at as "completedAt", duration_ms as "durationMs", total_found as "totalFound", accepted, review_required as "reviewRequired", duplicates, failed, status FROM discovery_runs ORDER BY started_at DESC LIMIT 20'
    );
    return NextResponse.json({ runs });
  } catch {
    return ingestionDbError();
  }
}

export const GET = withRateLimit(getRuns, { windowMs: 60_000, max: 60, keyPrefix: 'discovery-runs' });