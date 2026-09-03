import { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
    description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
    keywords: 'fresher jobs, jobs for freshers, fresher jobs India, off campus jobs, entry level jobs, graduate jobs, walk in jobs',
    alternates: {
        canonical: '/jobs',
    },
    openGraph: {
        title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
        description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified fresher jobs on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
        description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
        images: ['/main.png'],
    },
};

export default async function JobsPage() {
    const bootstrapData = await fetchFeedIndex(false);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.map(toOpportunityCardDTO) as any,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={null} initialData={initialData} />;
}
