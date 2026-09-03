import { Metadata } from 'next';
import { OpportunityType } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';
import sampleWalkins from '@/features/opportunities/data/sampleWalkins.json';
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
    const bootstrapData = await fetchBootstrapFeed(false, undefined, true);
    const feedWalkins = bootstrapData?.opportunities?.filter(o => o.type === OpportunityType.WALKIN) || [];
    const rawWalkins = feedWalkins.length > 0 ? feedWalkins : (sampleWalkins as any[]);
    const opportunities = rawWalkins.map(toOpportunityCardDTO);

    const initialData = {
        opportunities: opportunities as any,
        total: opportunities.length,
        cachedAt: bootstrapData?.generatedAt ? new Date(bootstrapData.generatedAt).getTime() : Date.now(),
    };

    return <WalkInsClient initialData={initialData} />;
}
