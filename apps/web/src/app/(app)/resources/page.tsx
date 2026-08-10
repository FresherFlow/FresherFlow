import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { ResourcesClient } from './ResourcesClient';

export const metadata = {
    title: 'Prep Resources | FresherFlow',
    description: 'Explore preparation roadmaps, interview guides, and study materials for companies and skills.',
};

export default async function ResourcesDirectoryPage() {
    const feed = await getResourcesFeed();

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Prep Resources</h1>
                <p className="text-muted-foreground mt-2">
                    Roadmaps, video tutorials & interview guides
                </p>
            </div>
            <ResourcesClient feed={feed} />
        </div>
    );
}
