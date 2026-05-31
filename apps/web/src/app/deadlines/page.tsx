import { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import DeadlinesClientPage from './DeadlinesClientPage';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Jobs Closing Soon',
    description: 'Track and apply to entry-level jobs and fresher opportunities closing soon.',
    alternates: {
        canonical: '/deadlines',
    },
};

export default async function DeadlinesPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const opportunities = bootstrapData ? bootstrapData.opportunities : [];

    return <DeadlinesClientPage initialOpportunities={opportunities} />;
}
