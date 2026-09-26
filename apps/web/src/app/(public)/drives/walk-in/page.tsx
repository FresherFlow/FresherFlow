import { Metadata } from 'next';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { WalkInsClient } from './WalkInsClient';

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
    // untracked=true: server fetch without Next tagged cache (matches sibling routes)
    const bootstrapData = await fetchFeedIndex(false, undefined, true);
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
