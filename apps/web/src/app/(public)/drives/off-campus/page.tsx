import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Off-Campus Drives for Freshers in India',
    description:
        'Off-campus hiring drives open to freshers across India — eligibility, registration deadlines and direct apply links.',
    alternates: {
        canonical: '/drives/off-campus',
    },
    openGraph: {
        title: 'Off-Campus Drives for Freshers in India',
        description:
            'Off-campus hiring drives open to freshers, with eligibility, deadlines and apply links.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Off-campus drives on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Off-Campus Drives for Freshers in India',
        description:
            'Off-campus hiring drives open to freshers, with eligibility, deadlines and apply links.',
        images: ['/main.png'],
    },
};

export default async function OffCampusDrivesPage() {
    const feed = await fetchFeedIndex(false, undefined, true);
    const opps = (feed?.opportunities || []).filter((o) => matchesFeedType(o, 'OFF_CAMPUS'));
    const initialData = opps.length
        ? {
              opportunities: opps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
              total: opps.length,
              cachedAt: new Date(feed?.generatedAt || Date.now()).getTime(),
          }
        : null;

    return <CategoryPage type="OFF_CAMPUS" initialData={initialData} />;
}
