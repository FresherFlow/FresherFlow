import { Metadata } from 'next';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { WalkInsClient } from './WalkInsClient';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-in Interviews for Freshers | India',
    description:
        'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, venues and eligibility details.',
    alternates: {
        canonical: '/drives/walk-in',
    },
    openGraph: {
        title: 'Walk-in Interviews for Freshers | India',
        description:
            'Verified walk-in interviews and direct hiring drives for freshers across India.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Walk-in interviews on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Walk-in Interviews for Freshers | India',
        description:
            'Verified walk-in interviews and direct hiring drives for freshers across India.',
        images: ['/main.png'],
    },
};

/* SEO note: the H1 + intro copy that used to render here was removed from the
   visible page. Crawlers still get the title/description via `metadata` above. */

export default async function WalkInDrivesPage() {
    // Tracked + bounded read: the `feed-index` tag lets a publish bust this
    // page immediately, and the bound lets it pick the change up on its own
    // when the publish webhook never arrives.
    const bootstrapData = await fetchFeedIndex();
    const initialData = bootstrapData
        ? {
              opportunities: bootstrapData.opportunities
                  .slice(0, FEED_PAGE_SIZE)
                  .map(toOpportunityCardDTO) as any,
              total: bootstrapData.count,
              cachedAt: new Date(bootstrapData.generatedAt).getTime(),
          }
        : null;

    return <WalkInsClient initialData={initialData} />;
}
