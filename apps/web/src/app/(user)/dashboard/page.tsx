import type { Metadata } from 'next';
import DashboardClient from './_components/DashboardClient';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Your personalized dashboard – latest fresher jobs, walk-ins, and internships curated for your profile.',
    robots: { index: false, follow: false },
};

export default async function DashboardPage() {
    // Lightweight feed-index: dashboard only renders card fields, not descriptions.
    const feedIndexData = await fetchFeedIndex();
    const initialData = feedIndexData ? {
        opportunities: feedIndexData.opportunities,
        total: feedIndexData.opportunities.length,
        cachedAt: new Date(feedIndexData.generatedAt).getTime(),
    } : null;
    return <DashboardClient initialData={initialData} />;
}
