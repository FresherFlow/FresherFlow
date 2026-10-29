import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { isDriveOpportunity, matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Campus & Walk-in Drives for Freshers in India',
    description:
        'Every campus and walk-in drive hiring freshers in India — off-campus drives, college recruitment drives and walk-in interviews, with venue, dates and direct apply links.',
    alternates: {
        canonical: '/drives',
    },
    openGraph: {
        title: 'Campus & Walk-in Drives for Freshers in India',
        description:
            'Off-campus and walk-in drives hiring freshers across India, with venue, dates and apply links.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Campus and walk-in drives on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Campus & Walk-in Drives for Freshers in India',
        description:
            'Off-campus and walk-in drives hiring freshers across India, with venue, dates and apply links.',
        images: ['/main.png'],
    },
};

/**
 * Drives hub: every fresher-facing drive in one feed.
 *
 * Off-campus and walk-in are the two refinements of the same axis, so the hub
 * unions them rather than showing one and hiding the other.
 */
export default async function DrivesHubPage() {
    const feed = await fetchFeedIndex();
    const opps = (feed?.opportunities || []).filter(
        (o) => isDriveOpportunity(o) || matchesFeedType(o, 'WALKIN')
    );
    const initialData = opps.length
        ? {
              opportunities: opps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
              total: opps.length,
              cachedAt: new Date(feed?.generatedAt || Date.now()).getTime(),
          }
        : null;

    return <CategoryPage type="DRIVES" initialData={initialData} />;
}
