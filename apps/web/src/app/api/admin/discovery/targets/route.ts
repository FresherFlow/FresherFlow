import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';
  try {
    const response = await fetch(`${ingestionUrl}/run/targets`, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ targets: [], error: error.message }, { status: 500 });
  }
}
