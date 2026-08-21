import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';

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
    const bootstrapData = await fetchBootstrapFeed(false, undefined, true);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.filter(o => {
            const isRemote = (o.locations || []).some(loc => {
                const l = loc.toLowerCase();
                return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
            }) || (o as any).workMode === 'REMOTE' || o.title.toLowerCase().includes('remote');
            return isRemote;
        }).map(toOpportunityCardDTO) as any,
        total: bootstrapData.opportunities.filter(o => {
            const isRemote = (o.locations || []).some(loc => {
                const l = loc.toLowerCase();
                return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
            }) || (o as any).workMode === 'REMOTE' || o.title.toLowerCase().includes('remote');
            return isRemote;
        }).length,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.REMOTE} initialData={initialData} />;
}
