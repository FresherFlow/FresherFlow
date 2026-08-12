import { NextResponse } from 'next/server';

const INGESTION_URL = process.env.INGESTION_SERVICE_URL || process.env.NEXT_PUBLIC_INGESTION_URL || process.env.INGESTION_URL || 'http://localhost:3005';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const res = await fetch(`${INGESTION_URL}/stats/summary${query ? '?' + query : ''}`, {
      headers: { 'Cache-Control': 'no-store' },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Ingestion service unreachable' }, { status: 503 });
  }
}
