import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { loadDefaultTargets } from '@/lib/ingestion/targets';

export const dynamic = 'force-dynamic';

async function getTargets(request: NextRequest) {
  try {
    const targets = await loadDefaultTargets();
    return NextResponse.json({
      status: 'ok',
      total: targets.length,
      targets
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getTargets, { windowMs: 60_000, max: 60, keyPrefix: 'discovery-targets' });