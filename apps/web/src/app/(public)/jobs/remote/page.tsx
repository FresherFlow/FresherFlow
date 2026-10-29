import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import type { Opportunity } from '@fresherflow/types';
import { isRemoteOpportunity } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

const REMOTE_TITLE = 'Remote Jobs for Freshers | Work From Home Jobs';
const REMOTE_DESCRIPTION =
    'Find verified remote jobs and work-from-home opportunities for freshers, including entry-level roles and remote internships.';

// This was the only hub page carrying neither `openGraph` nor `twitter`, so a
// shared /jobs/remote link fell back to the root layout's generic card while its
// eight siblings each had their own.
export const metadata: Metadata = {
    title: REMOTE_TITLE,
    description: REMOTE_DESCRIPTION,
    alternates: {
        canonical: '/jobs/remote',
    },
    openGraph: {
        title: REMOTE_TITLE,
        description: REMOTE_DESCRIPTION,
        type: 'website',
        images: [{ url: '/main.png', width: 1200, height: 630, alt: 'Remote fresher jobs on FresherFlow' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: REMOTE_TITLE,
        description: REMOTE_DESCRIPTION,
        images: ['/main.png'],
    },
};

export default async function RemotePage() {
    // Lightweight feed-index instead of full bootstrap — same card fields, ~4x lighter.
    const feedIndexData = await fetchFeedIndex();
    const remoteOpps = (feedIndexData?.opportunities || []).filter((o: Opportunity) => isRemoteOpportunity(o));
    const initialData = remoteOpps.length ? {
        opportunities: remoteOpps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: remoteOpps.length,
        cachedAt: new Date(feedIndexData?.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type="REMOTE" initialData={initialData} />;
}
