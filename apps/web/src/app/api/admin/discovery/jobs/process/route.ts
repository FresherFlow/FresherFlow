import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { withAdminAuth } from '@/lib/server/adminAuth';
import { INGESTION_URL, INGESTION_SECRET } from '@/lib/server/env';

export const dynamic = 'force-dynamic';

async function processJobs(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const res = await fetch(`${INGESTION_URL}/data/jobs/process-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}),
      },
      body: JSON.stringify({ ids }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Ingestion engine is unreachable. Processing discovered jobs requires the ingestion engine to scrape and enrich job details.' },
      { status: 503 }
    );
  }
}

export const POST = withRateLimit(withAdminAuth(processJobs), { windowMs: 60_000, max: 30, keyPrefix: 'discovery-jobs-process' });