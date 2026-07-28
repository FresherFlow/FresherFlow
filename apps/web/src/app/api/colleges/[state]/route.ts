import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ state: string }> }
) {
    const { state } = await params;
    const slug = state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // 1. Fetch live data from Cloudflare CDN server-side (bypasses browser CORS restrictions in local dev)
    try {
        const cdnUrl = `https://cdn.fresherflow.in/api/colleges/${slug}.json`;
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
