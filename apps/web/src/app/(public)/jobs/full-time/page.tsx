import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Full-Time Jobs for Freshers in India',
    description:
        'Full-time fresher jobs across India — permanent entry-level roles from verified company career pages with direct apply links.',
    alternates: {
        canonical: '/jobs/full-time',
    },
    openGraph: {
        title: 'Full-Time Jobs for Freshers in India',
        description:
            'Permanent entry-level full-time jobs for freshers in India, verified against official company career pages.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Full-time fresher jobs on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Full-Time Jobs for Freshers in India',
        description:
            'Permanent entry-level full-time jobs for freshers in India, verified against official company career pages.',
        images: ['/main.png'],
    },
};

export default async function FullTimeJobsPage() {
    const feed = await fetchFeedIndex();
    const opps = (feed?.opportunities || []).filter((o) => matchesFeedType(o, 'FULL_TIME'));
    const initialData = opps.length
        ? {
              opportunities: opps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
              total: opps.length,
              cachedAt: new Date(feed?.generatedAt || Date.now()).getTime(),
          }
        : null;

    return <CategoryPage type="FULL_TIME" initialData={initialData} />;
}
