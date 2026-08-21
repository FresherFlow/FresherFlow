import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { ResourcePageView } from '@/features/resources/components/ResourcePageView';

export const metadata = {
    title: 'Career & Interview Preparation Resources for Freshers',
    description: 'Explore interview preparation guides, company-specific resources, skill roadmaps and career materials for students and freshers.',
};

export default async function ResourcesDirectoryPage() {
    const feed = await getResourcesFeed();

    return (
        <ResourcePageView feed={feed} />
    );
}
