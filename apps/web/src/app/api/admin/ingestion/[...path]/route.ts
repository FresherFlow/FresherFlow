import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';

const INGESTION_SERVICE_URL = process.env.INGESTION_SERVICE_URL || 'http://localhost:3005';
const INGESTION_SECRET = process.env.INGESTION_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow 5 minutes for crawler jobs

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const urlPath = path.join('/');
    const url = new URL(req.url);
    const searchParams = url.searchParams.toString();
    
    const targetUrl = `${INGESTION_SERVICE_URL}/${urlPath}${searchParams ? `?${searchParams}` : ''}`;
    
    try {
        const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;
        
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': req.headers.get('Content-Type') || 'application/json',
                ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}),
            },
            body,
            signal: AbortSignal.timeout(280000), // ~4.6 mins, just under 5 mins
        });
        
        const data = await response.text();
        
        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (err: unknown) {
        console.error(`[Ingestion Proxy Error] ${req.method} ${targetUrl}:`, err);
        return NextResponse.json(
            { error: 'Failed to communicate with Ingestion Service', details: err instanceof Error ? err.message : 'Unknown error' },
            { status: 502 }
        );
    }
}

export const GET = withRateLimit(
    async (req, context) => {
        const props = context as { params: Promise<{ path: string[] }> };
        return proxyRequest(req, props);
    },
    { windowMs: 60_000, max: 60, keyPrefix: 'ingestion' }
);

export const POST = withRateLimit(
    async (req, context) => {
        const props = context as { params: Promise<{ path: string[] }> };
        return proxyRequest(req, props);
    },
    { windowMs: 60_000, max: 60, keyPrefix: 'ingestion' }
);

export const PUT = withRateLimit(
    async (req, context) => {
        const props = context as { params: Promise<{ path: string[] }> };
        return proxyRequest(req, props);
    },
    { windowMs: 60_000, max: 60, keyPrefix: 'ingestion' }
);

export const DELETE = withRateLimit(
    async (req, context) => {
        const props = context as { params: Promise<{ path: string[] }> };
        return proxyRequest(req, props);
    },
    { windowMs: 60_000, max: 60 }
);
