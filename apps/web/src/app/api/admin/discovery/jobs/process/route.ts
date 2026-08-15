import { NextResponse } from 'next/server';

const INGESTION_URL = process.env.INGESTION_SERVICE_URL || process.env.NEXT_PUBLIC_INGESTION_URL || process.env.INGESTION_URL || 'http://localhost:3005';
const INGESTION_SECRET = process.env.INGESTION_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
  } catch (e) {
    return NextResponse.json({ error: 'Ingestion service unreachable' }, { status: 503 });
  }
}
