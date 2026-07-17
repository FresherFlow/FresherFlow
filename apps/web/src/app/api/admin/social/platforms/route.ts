import { NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET ?? '';

export const dynamic = 'force-dynamic';

/** GET /api/admin/social/platforms
 *  Proxies to the worker's /social/platforms endpoint.
 *  Returns { telegram: bool, x: bool, linkedin: bool } — which platforms are configured.
 */
export async function GET() {
    if (!WORKER_URL) {
        return NextResponse.json(
            { telegram: false, x: false, linkedin: false, reason: 'WORKER_URL not configured' },
            { status: 200 },
        );
    }

    try {
        const res = await fetch(`${WORKER_URL}/social/platforms`, {
            headers: { 'x-worker-secret': WORKER_SECRET },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) {
            return NextResponse.json(
                { telegram: false, x: false, linkedin: false, reason: `Worker ${res.status}` },
                { status: 200 },
            );
        }
        const data = await res.json() as { telegram: boolean; x: boolean; linkedin: boolean };
        return NextResponse.json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unreachable';
        return NextResponse.json({ telegram: false, x: false, linkedin: false, reason: msg }, { status: 200 });
    }
}
