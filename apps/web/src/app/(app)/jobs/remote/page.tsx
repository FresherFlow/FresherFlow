import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Remote Jobs & Internships',
    description: 'Find verified remote jobs and work-from-home internships for freshers.',
    keywords: 'remote jobs, wfh, work from home jobs, fresher remote jobs, remote internships',
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
