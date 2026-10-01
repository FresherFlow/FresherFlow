import { NextResponse } from 'next/server';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { withRateLimit } from '@/lib/api/rateLimit';
import { withAdminAuth } from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';

async function getBootstrapFeed() {
    try {
        const feed = await fetchBootstrapFeed(true);
        if (feed) {
            return NextResponse.json(feed, { status: 200 });
        }
        return NextResponse.json({ opportunities: [] }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch bootstrap feed from API via cdnFeed:', error);
        return NextResponse.json({ opportunities: [], error: 'Failed to fetch bootstrap feed' }, { status: 500 });
    }
}

export const GET = withRateLimit(withAdminAuth(getBootstrapFeed), { windowMs: 60_000, max: 60, keyPrefix: 'bootstrap-feed' });
