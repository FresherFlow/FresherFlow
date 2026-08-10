import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';
  try {
    const response = await fetch(`${ingestionUrl}/stats/summary`, { cache: 'no-store' });
    const data = await response.json();
    
    // Also fetch the last run to populate lastRunData
    let lastRun = null;
    try {
      const runsResponse = await fetch(`${ingestionUrl}/data/runs`, { cache: 'no-store' });
      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        if (runsData.runs && runsData.runs.length > 0) {
          lastRun = runsData.runs[0];
        }
      }
    } catch (e) {}

    return NextResponse.json({ ...data, lastRun });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
