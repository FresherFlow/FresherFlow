import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-in Interviews for Freshers | India',
    description: 'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, locations and eligibility details.',
    keywords: 'walk in interviews, walk in jobs, fresher walk ins, walk in drives, direct hiring, off campus drives',
    alternates: {
        canonical: '/jobs/walk-ins',
    },
    openGraph: {
        title: 'Walk-in Interviews for Freshers | India',
        description: 'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, locations and eligibility details.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified walk-ins on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Walk-in Interviews for Freshers | India',
        description: 'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, locations and eligibility details.',
        images: ['/main.png'],
    },
};

export default async function WalkInsPage() {
    const bootstrapData = await fetchBootstrapFeed(false, undefined, true);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.filter(o => o.type === OpportunityType.WALKIN).map(toOpportunityCardDTO) as any,
        total: bootstrapData.opportunities.filter(o => o.type === OpportunityType.WALKIN).length,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.WALKIN} initialData={initialData} />;
}
