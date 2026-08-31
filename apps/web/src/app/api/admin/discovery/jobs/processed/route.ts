import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import {
  hasIngestionDb,
  queryRows,
  execute,
  ingestionDbError,
  PROCESSED_JOB_COLUMNS
} from '@/lib/ingestion/db';

export const dynamic = 'force-dynamic';

interface ProcessedJobRow {
  id: string;
  applyLink: string | null;
  title: string | null;
  company: string | null;
  status: string | null;
  createdAt: Date | null;
}

async function getProcessed(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitRaw = searchParams.get('limit');
    const limit = Math.max(1, Math.min(1000, parseInt(limitRaw ?? '50', 10) || 50));

    let q = `SELECT ${PROCESSED_JOB_COLUMNS} FROM processed_jobs`;
    const params: unknown[] = [];
    if (status && status !== 'ALL') {
      q += ' WHERE status = $1';
      params.push(status);
    }
    params.push(String(limit));
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const jobs = await queryRows<ProcessedJobRow>(q, params);
    return NextResponse.json({ jobs });
  } catch {
    return ingestionDbError();
  }
}

async function patchProcessed(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const body = await request.json();
    const { id, status } = body;
    const { searchParams } = new URL(request.url);
    const jobId = id || searchParams.get('id');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const statusValue = typeof status === 'string' ? status : null;
    await execute('UPDATE discovered_jobs SET status = $1 WHERE id = $2', [statusValue, jobId]);
    return NextResponse.json({ ok: true });
  } catch {
    return ingestionDbError();
  }
}

const rateLimitOptions = { windowMs: 60_000, max: 60, keyPrefix: 'discovery-jobs-processed' };

export const GET = withRateLimit(getProcessed, rateLimitOptions);
export const PATCH = withRateLimit(patchProcessed, rateLimitOptions);