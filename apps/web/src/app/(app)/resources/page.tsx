import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { ResourcePageView } from '@/features/resources/components/ResourcePageView';

export const metadata = {
    title: 'Prep Resources | FresherFlow',
    description: 'Explore preparation roadmaps, interview guides, and study materials for companies and skills.',
};

export default async function ResourcesDirectoryPage() {
    const feed = await getResourcesFeed();

    return (
        <ResourcePageView feed={feed} />
    );
}
