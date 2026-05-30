import { NextResponse } from 'next/server';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

export const dynamic = 'force-dynamic';

export async function GET() {
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
