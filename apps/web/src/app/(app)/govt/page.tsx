import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { fetchGovernmentFeed, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Government Jobs in India | Govt Jobs & Recruitment',
    description: 'Find verified government job notifications, SSC, banking, railway, UPSC and public sector recruitment opportunities with official apply links.',
    keywords: 'government jobs, govt jobs, government jobs India, SSC jobs, railway jobs, banking jobs, UPSC jobs, Sarkari jobs',
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
    let govtData = await fetchGovernmentFeed(false, undefined, true);
    if (!govtData || !govtData.opportunities || govtData.opportunities.length === 0) {
        const bootstrapData = await fetchBootstrapFeed(false, undefined, true);
        if (bootstrapData && bootstrapData.opportunities) {
            const govtOpps = bootstrapData.opportunities.filter(
                (o) => o.type === OpportunityType.GOVERNMENT || Boolean(o.governmentJobDetails)
            );
            govtData = {
                opportunities: govtOpps,
                count: govtOpps.length,
                generatedAt: bootstrapData.generatedAt,
            };
        }
    }

    const initialData = govtData ? {
        opportunities: govtData.opportunities.map(toOpportunityCardDTO) as any,
        total: govtData.opportunities.length,
        cachedAt: new Date(govtData.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.GOVERNMENT} initialData={initialData} />;
}
