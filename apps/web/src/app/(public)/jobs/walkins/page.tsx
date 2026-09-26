import { Metadata } from 'next';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { WalkInsClient } from './WalkInsClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-in Drives & Interviews for Freshers | India',
    description: 'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, locations and eligibility details.',
    alternates: {
        canonical: '/jobs/walkins',
    },
};

/* SEO note: the H1 + intro copy that used to render here was removed from the
   visible page. Crawlers still get the title/description via `metadata` above. */

export default async function WalkInsPage() {
    // untracked=true: server fetch without Next tagged cache (matches sibling routes)
    const bootstrapData = await fetchFeedIndex(false, undefined, true);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <WalkInsClient initialData={initialData} />;
}
