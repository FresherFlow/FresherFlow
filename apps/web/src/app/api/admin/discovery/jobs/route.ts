import { NextResponse } from 'next/server';

const INGESTION_URL = process.env.INGESTION_SERVICE_URL || process.env.NEXT_PUBLIC_INGESTION_URL || process.env.INGESTION_URL || 'http://localhost:3005';
const INGESTION_SECRET = process.env.INGESTION_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await fetch(`${INGESTION_URL}/data/jobs${query ? '?' + query : ''}`, {
      headers: { 'Cache-Control': 'no-store' },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Ingestion service unreachable' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const { searchParams } = new URL(request.url);
    const jobId = id || searchParams.get('id');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const res = await fetch(`${INGESTION_URL}/data/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Ingestion service unreachable' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${INGESTION_URL}/data/jobs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Ingestion service unreachable' }, { status: 503 });
  }
}
