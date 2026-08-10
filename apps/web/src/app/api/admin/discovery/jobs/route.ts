import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';
  
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = searchParams.get('limit') || '50';
  const queue = searchParams.get('queue');
  
  try {
    const basePath = queue === 'processed' ? '/data/jobs/processed' : '/data/jobs';
    const fetchUrl = new URL(`${ingestionUrl}${basePath}`);
    if (status) fetchUrl.searchParams.set('status', status);
    fetchUrl.searchParams.set('limit', limit);
    
    const response = await fetch(fetchUrl.toString(), { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ jobs: [], error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';
  
  try {
    const body = await req.json();
    const fetchUrl = new URL(`${ingestionUrl}/data/jobs`);
    
    const internalSecret = process.env.INTERNAL_API_SECRET || 'your-super-secret-access-key-change-this-in-production-min-32-chars';
    
    const response = await fetch(fetchUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalSecret}`,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
