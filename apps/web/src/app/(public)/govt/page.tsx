import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchGovernmentFeed, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { isGovernmentOpportunity } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Government Jobs in India | Govt Jobs & Recruitment',
    description: 'Find verified government job notifications, SSC, banking, railway, UPSC and public sector recruitment opportunities with official apply links.',
    alternates: {
        canonical: '/govt',
    },
    openGraph: {
        title: 'Government Jobs in India | Govt Jobs & Recruitment',
        description: 'Find verified government job notifications, SSC, banking, railway, UPSC and public sector recruitment opportunities with official apply links.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified government jobs on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Government Jobs in India | Govt Jobs & Recruitment',
        description: 'Find verified government job notifications, SSC, banking, railway, UPSC and public sector recruitment opportunities with official apply links.',
        images: ['/main.png'],
    },
};

export default async function GovernmentJobsPage() {
    let govtData = await fetchGovernmentFeed();
    if (!govtData || !govtData.opportunities || govtData.opportunities.length === 0) {
        // Lightweight feed-index fallback (governmentJobDetails included in index fields)
        const feedIndexData = await fetchFeedIndex();
        if (feedIndexData && feedIndexData.opportunities) {
            const govtOpps = feedIndexData.opportunities.filter((o) => isGovernmentOpportunity(o));
            govtData = {
                opportunities: govtOpps,
                count: govtOpps.length,
                generatedAt: feedIndexData.generatedAt,
            };
        }
    }

    const initialData = govtData ? {
        opportunities: govtData.opportunities.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: govtData.opportunities.length,
        cachedAt: new Date(govtData.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type="GOVERNMENT" initialData={initialData} />;
}
