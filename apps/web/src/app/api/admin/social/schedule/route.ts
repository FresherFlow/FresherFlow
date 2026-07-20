import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET ?? '';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** POST /api/admin/social/schedule
 *  Queues a BullMQ delayed job via the worker.
 *  Body: { platform: 'telegram' | 'x' | 'linkedin', text: string, scheduledAt: number (ms) }
 */
export async function POST(req: NextRequest) {
    if (!WORKER_URL) {
        return NextResponse.json({ error: 'WORKER_URL not configured' }, { status: 503 });
    }

    let body: { platform?: string; text?: string; scheduledAt?: number };
    try {
        body = await req.json() as typeof body;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { platform, text, scheduledAt } = body;
    if (!platform || !text?.trim() || !scheduledAt) {
        return NextResponse.json({ error: 'platform, text and scheduledAt are required' }, { status: 400 });
    }
    if (scheduledAt <= Date.now()) {
        return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
    }

    try {
        const workerRes = await fetch(`${WORKER_URL}/social/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-worker-secret': WORKER_SECRET },
            body: JSON.stringify({ platform, text, scheduledAt }),
            signal: AbortSignal.timeout(10000),
        });
        const data = await workerRes.json() as { ok?: boolean; error?: string };
        if (!workerRes.ok || !data.ok) {
            return NextResponse.json({ error: data.error ?? 'Worker rejected the request' }, { status: 502 });
        }
        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Worker unreachable';
        return NextResponse.json({ error: msg }, { status: 502 });
    }
}

/** DELETE /api/admin/social/schedule
 *  Cancels a scheduled BullMQ delayed job.
 *  Body: { jobId: string }
 */
export async function DELETE(req: NextRequest) {
    if (!WORKER_URL) {
        return NextResponse.json({ error: 'WORKER_URL not configured' }, { status: 503 });
    }

    let body: { jobId?: string };
    try {
        body = await req.json() as typeof body;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { jobId } = body;
    if (!jobId) {
        return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    try {
        const workerRes = await fetch(`${WORKER_URL}/social/schedule`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-worker-secret': WORKER_SECRET },
            body: JSON.stringify({ jobId }),
            signal: AbortSignal.timeout(10000),
        });
        const data = await workerRes.json() as { ok?: boolean; error?: string };
        if (!workerRes.ok || !data.ok) {
            return NextResponse.json({ error: data.error ?? 'Worker rejected the request' }, { status: 502 });
        }
        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Worker unreachable';
        return NextResponse.json({ error: msg }, { status: 502 });
    }
}
