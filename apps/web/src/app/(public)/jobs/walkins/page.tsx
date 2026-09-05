import { Metadata } from 'next';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { WalkInsClient } from './WalkInsClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Walk-in Drives & Interviews for Freshers | India',
    description: 'Find verified walk-in interviews and direct hiring drives for freshers across India with interview dates, locations and eligibility details.',
    keywords: 'walk in interviews, walk in jobs, fresher walk ins, walk in drives, direct hiring, off campus drives',
    alternates: {
        canonical: '/jobs/walkins',
    },
};

export default async function WalkInsPage() {
    const bootstrapData = await fetchFeedIndex(false);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.map(toOpportunityCardDTO) as any,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <WalkInsClient initialData={initialData} />;
}
