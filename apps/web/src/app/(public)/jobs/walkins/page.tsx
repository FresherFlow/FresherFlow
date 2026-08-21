import { Metadata } from 'next';
import { Suspense } from 'react';
import WalkinClient from './WalkinClient';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-In Jobs | FresherFlow',
    description: 'Browse verified walk-in drives and direct interview opportunities across India.',
    alternates: {
        canonical: '/jobs/walkins',
    },
};

export default async function WalkinsPage() {
    const bootstrapData = await fetchBootstrapFeed(false);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.map(toOpportunityCardDTO) as any,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <WalkinClient initialData={initialData} />
        </Suspense>
    );
}
