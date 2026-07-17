import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET ?? '';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface SendBody {
    platform: 'telegram' | 'x' | 'linkedin';
    text: string;
}

/** POST /api/admin/social/send
 *  Proxies a manual caption send request to the worker's /social/send endpoint.
 *  Body: { platform: 'telegram' | 'x' | 'linkedin', text: string }
 *  The worker holds all social API credentials — this route never touches them.
 */
export async function POST(req: NextRequest) {
    if (!WORKER_URL) {
        return NextResponse.json({ error: 'WORKER_URL not configured on this deployment' }, { status: 503 });
    }

    let body: SendBody;
    try {
        body = await req.json() as SendBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { platform, text } = body;
    if (!platform || !text?.trim()) {
        return NextResponse.json({ error: 'platform and text are required' }, { status: 400 });
    }

    const ALLOWED_PLATFORMS = ['telegram', 'x', 'linkedin'] as const;
    if (!ALLOWED_PLATFORMS.includes(platform)) {
        return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    try {
        const workerRes = await fetch(`${WORKER_URL}/social/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-secret': WORKER_SECRET,
            },
            body: JSON.stringify({ platform, text }),
            signal: AbortSignal.timeout(25000),
        });

        const data = await workerRes.json() as { ok?: boolean; result?: string; error?: string };

        if (!workerRes.ok || !data.ok) {
            return NextResponse.json({ error: data.error ?? 'Worker rejected the request' }, { status: 502 });
        }

        return NextResponse.json({ ok: true, result: data.result });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Worker unreachable';
        return NextResponse.json({ error: msg }, { status: 502 });
    }
}
