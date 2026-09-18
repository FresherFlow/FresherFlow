import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';
import type { Opportunity } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Remote Jobs for Freshers | Work From Home Jobs',
    description: 'Find verified remote jobs and work-from-home opportunities for freshers, including entry-level roles and remote internships.',
    keywords: 'remote jobs for freshers, work from home jobs, WFH jobs, remote fresher jobs, remote internships, entry level remote jobs',
    alternates: {
        canonical: '/jobs/remote',
    },
};

export default async function RemotePage() {
    // Lightweight feed-index instead of full bootstrap — same card fields, ~4x lighter.
    const feedIndexData = await fetchFeedIndex(false, undefined, true);
    const remoteFilter = (o: Opportunity) => {
        const isRemote = (o.locations || []).some(loc => {
            const l = loc.toLowerCase();
            return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
        }) || (o as any).workMode === 'REMOTE' || o.title.toLowerCase().includes('remote');
        return isRemote;
    };
    const remoteOpps = (feedIndexData?.opportunities || []).filter(remoteFilter);
    const initialData = remoteOpps.length ? {
        opportunities: remoteOpps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: remoteOpps.length,
        cachedAt: new Date(feedIndexData?.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.REMOTE} initialData={initialData} />;
}
