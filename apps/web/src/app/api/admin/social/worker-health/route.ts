import { NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET ?? '';

export const dynamic = 'force-dynamic';

/** GET /api/admin/social/worker-health
 *  Pings the worker's /health endpoint and returns its status.
 *  Used by CaptionsTool to show a live "worker online" badge before sending.
 */
export async function GET() {
    if (!WORKER_URL) {
        return NextResponse.json({ online: false, reason: 'WORKER_URL not configured' }, { status: 200 });
    }

    try {
        const res = await fetch(`${WORKER_URL}/health`, {
            headers: { 'x-worker-secret': WORKER_SECRET },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            return NextResponse.json({ online: false, reason: `Worker returned ${res.status}` }, { status: 200 });
        }
        const data = await res.json() as { status?: string; uptime?: number };
        return NextResponse.json({ online: data.status === 'ok', uptime: data.uptime ?? null });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unreachable';
        return NextResponse.json({ online: false, reason: msg }, { status: 200 });
    }
}
