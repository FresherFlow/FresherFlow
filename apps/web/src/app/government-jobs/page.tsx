import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';
import { fetchGovernmentFeed } from '@/lib/api/cdnFeed';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Government Jobs',
    description: 'Discover verified government job notifications, SSC recruitment, public sector vacancies, and exam circulars with direct apply options.',
    keywords: 'government jobs, govt jobs, ssc, banking jobs, railway jobs, upsc, sarkari naukri',
    alternates: {
        canonical: '/government-jobs',
    },
    openGraph: {
        title: 'Verified Government Jobs',
        description: 'Discover verified government job notifications, SSC recruitment, public sector vacancies, and exam circulars.',
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
        title: 'Verified Government Jobs',
        description: 'Discover verified government job notifications, SSC recruitment, public sector vacancies, and exam circulars.',
        images: ['/main.png'],
    },
};

export default async function GovernmentJobsPage() {
    const govtData = await fetchGovernmentFeed();
    const initialData = govtData ? {
        opportunities: govtData.opportunities,
        total: govtData.opportunities.length,
        cachedAt: new Date(govtData.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.GOVERNMENT} initialData={initialData} />;
}
