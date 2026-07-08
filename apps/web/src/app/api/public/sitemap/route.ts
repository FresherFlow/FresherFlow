import { NextRequest, NextResponse } from 'next/server';
import { CDN_URL } from '@/lib/utils/runtimeConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const file = searchParams.get('file');

        if (!file || !/^sitemap(-[a-zA-Z0-9-_]+)?\.xml$/.test(file)) {
            return new NextResponse('Invalid sitemap file', { status: 400 });
        }

        const cdnBase = (CDN_URL || 'https://cdn.fresherflow.in').replace(/\/+$/, '');
        const sitemapUrl = `${cdnBase}/${file}`;

        const res = await fetch(sitemapUrl, {
            next: { revalidate: 3600 } // Cache sitemaps on Vercel Edge for 1 hour
        });

        if (!res.ok) {
            return new NextResponse('Sitemap not found', { status: 404 });
        }

        let xml = await res.text();

        // Resolve request protocol and host header dynamically
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'fresherflow.in';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const currentDomain = `${proto}://${host}`;

        // Dynamically replace all production links with the current requesting domain
        xml = xml.replaceAll('https://fresherflow.in', currentDomain);

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        console.error('Dynamic sitemap serving failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
