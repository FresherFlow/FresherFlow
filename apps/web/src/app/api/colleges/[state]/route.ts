import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import { withRateLimit } from '@/lib/api/rateLimit';

async function getStateColleges(
    request: NextRequest,
    { params }: { params: Promise<{ state: string }> }
) {
    const { state } = await params;
    const slug = state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // 1. Fetch live data from Cloudflare CDN server-side (bypasses browser CORS restrictions in local dev)
    try {
        const cdnUrl = `${CDN_URL}/api/colleges/${slug}.json`;
        const res = await fetch(cdnUrl, { next: { revalidate: 3600 } });
        if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
        }
    } catch (err) {
        console.warn(`[colleges API] CDN fetch failed for ${slug}, trying local reference:`, err);
    }

    // 2. Fallback to local reference file in colleges/ directory if CDN is unreachable locally
    try {
        const localPath = path.join(process.cwd(), '../../colleges', `${slug}.json`);
        const fileData = await fs.readFile(localPath, 'utf-8');
        const data = JSON.parse(fileData);
        return NextResponse.json(data);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}

export const GET = withRateLimit(
    async (request, context) => {
        const props = context as { params: Promise<{ state: string }> };
        return getStateColleges(request, props);
    },
    { windowMs: 60_000, max: 30, keyPrefix: 'colleges-state' }
);
