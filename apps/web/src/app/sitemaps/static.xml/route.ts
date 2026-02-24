import { NextResponse } from 'next/server';
import { SITE_URL, urlsetXml } from '../_lib';

export const revalidate = 3600;

export async function GET() {
    const now = new Date().toISOString();
    const staticUrls = [
        `${SITE_URL}/`,
        `${SITE_URL}/jobs`,
        `${SITE_URL}/internships`,
        `${SITE_URL}/walk-ins`,
        `${SITE_URL}/opportunities`,
        `${SITE_URL}/privacy`,
        `${SITE_URL}/terms`,
    ];

    const xml = urlsetXml(staticUrls.map((loc) => ({ loc, lastmod: now })));
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
        },
    });
}
