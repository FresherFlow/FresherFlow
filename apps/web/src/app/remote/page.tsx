import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Remote Jobs & Internships',
    description: 'Find verified remote jobs and work-from-home internships for freshers.',
    keywords: 'remote jobs, wfh, work from home jobs, fresher remote jobs, remote internships',
    alternates: {
        canonical: '/remote',
    },
};

export default async function RemotePage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        // Since we are temporarily showing remote jobs via the JOB type, 
        // we'll filter by 'remote' in the location if possible, or just return all jobs 
        // as a fallback if the location string doesn't reliably contain "remote" for all.
        // For a true remote page, we'd ideally filter properly:
        opportunities: bootstrapData.opportunities.filter(o => 
            o.type === OpportunityType.JOB && 
            o.locations?.some(loc => loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('wfh'))
        ),
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    // We can still use CategoryPage with JOB type, but it will initially render the remote jobs
    return <CategoryPage type={OpportunityType.JOB} initialData={initialData} />;
}
