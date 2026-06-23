import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-in Interview Drives',
    description: 'Find direct walk-in interview drives near you. Explore verified on-site hiring events for freshers with clear venue details, eligibility criteria, and interview dates.',
    keywords: 'walk-in interviews, direct hiring events, fresher walk-ins, off campus drives, interview venues, direct interview openings',
    alternates: {
        canonical: '/walk-ins',
    },
    openGraph: {
        title: 'Walk-in Interview Drives',
        description: 'Find direct walk-in interview drives for freshers across India.',
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
        title: 'Walk-in Interview Drives',
        description: 'Find direct walk-in interview drives for freshers across India.',
        images: ['/main.png'],
    },
};

export default async function WalkInsPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.filter(o => o.type === OpportunityType.WALKIN),
        total: bootstrapData.opportunities.filter(o => o.type === OpportunityType.WALKIN).length,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.WALKIN} initialData={initialData} />;
}
