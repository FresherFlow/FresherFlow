import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import type { Opportunity } from '@fresherflow/types';
import { isRemoteOpportunity } from '@/features/jobs/utils/walkinMapUtils';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Remote Jobs for Freshers | Work From Home Jobs',
    description: 'Find verified remote jobs and work-from-home opportunities for freshers, including entry-level roles and remote internships.',
    alternates: {
        canonical: '/jobs/remote',
    },
};

export default async function RemotePage() {
    // Lightweight feed-index instead of full bootstrap — same card fields, ~4x lighter.
    const feedIndexData = await fetchFeedIndex(false, undefined, true);
    const remoteOpps = (feedIndexData?.opportunities || []).filter((o: Opportunity) => isRemoteOpportunity(o));
    const initialData = remoteOpps.length ? {
        opportunities: remoteOpps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: remoteOpps.length,
        cachedAt: new Date(feedIndexData?.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type="REMOTE" initialData={initialData} />;
}
