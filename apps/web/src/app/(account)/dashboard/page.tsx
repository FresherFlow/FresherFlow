import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

export const metadata: Metadata = {
    title: 'Dashboard | FresherFlow',
    description: 'Your personalized dashboard – latest fresher jobs, walk-ins, and internships curated for your profile.',
    robots: { index: false, follow: false },
};

export default async function DashboardPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities,
        total: bootstrapData.opportunities.length,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;
    return <DashboardClient initialData={initialData} />;
}
