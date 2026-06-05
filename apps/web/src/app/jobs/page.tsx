import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs for Freshers',
    description: 'Discover full-time job opportunities for freshers across India. Apply to verified openings at top companies with detailed eligibility criteria and direct application links.',
    keywords: 'fresher jobs, full-time jobs, entry level jobs, graduate jobs, jobs for freshers india, off campus jobs',
    alternates: {
        canonical: '/jobs',
    },
    openGraph: {
        title: 'Jobs for Freshers | FresherFlow',
        description: 'Discover full-time job opportunities for freshers across India.',
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
        title: 'Jobs for Freshers | FresherFlow',
        description: 'Discover full-time job opportunities for freshers across India.',
        images: ['/main.png'],
    },
};

export default async function JobsPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.filter(o => o.type === OpportunityType.JOB),
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.JOB} initialData={initialData} />;
}
