import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { hasIngestionDb, queryRows, execute, ingestionDbError } from '@/lib/ingestion/db';

export const dynamic = 'force-dynamic';

interface DiscoveredJobRow {
  id: string;
  company: string | null;
  title: string | null;
  location: string | null;
  apply_link: string | null;
  status: string | null;
  ats_type: string | null;
  fresher_score: number | null;
  created_at: Date | null;
}

async function getJobs(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitRaw = searchParams.get('limit');
    const limit = Math.max(1, Math.min(1000, parseInt(limitRaw ?? '50', 10) || 50));

    let q =
      'SELECT id, company, title, location, apply_link, status, source_type as ats_type, fresher_score, created_at FROM discovered_jobs';
    const params: unknown[] = [];
    if (status && status !== 'ALL') {
      q += ' WHERE status = $1';
      params.push(status);
    }
    params.push(String(limit));
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const jobs = await queryRows<DiscoveredJobRow>(q, params);
    return NextResponse.json({ jobs });
  } catch {
    return ingestionDbError();
  }
}

async function patchJob(request: NextRequest) {
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

async function deleteJobs(request: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();
  try {
    const body = await request.json();
    const { ids, type } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid ids' }, { status: 400 });
    }

    const table = type === 'processed' ? 'processed_jobs' : 'discovered_jobs';
    const deleted = await execute(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return ingestionDbError();
  }
}

const rateLimitOptions = { windowMs: 60_000, max: 60, keyPrefix: 'discovery-jobs' };

export const GET = withRateLimit(getJobs, rateLimitOptions);
export const PATCH = withRateLimit(patchJob, rateLimitOptions);
export const DELETE = withRateLimit(deleteJobs, rateLimitOptions);