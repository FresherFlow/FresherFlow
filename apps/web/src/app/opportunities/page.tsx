import { Metadata } from 'next';
import { Suspense } from 'react';
import { FeedPageSkeleton } from '@/components/ui/Skeleton';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { OpportunitiesFeedClient } from '@/features/jobs/components/OpportunitiesFeedClient';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Job Opportunities Feed',
    description: 'A verified feed of off-campus jobs, internships, and walk-in drives for fresh graduates. Every link is checked. No spam.',
    keywords: 'fresher jobs, internships, walk-ins, off campus drives, verified jobs, job feed',
    alternates: {
        canonical: '/opportunities',
    },
};

export default async function OpportunitiesPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <OpportunitiesFeedClient initialData={initialData} />
        </Suspense>
    );
}
