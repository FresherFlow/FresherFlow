import React from 'react';
import { Suspense } from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import ResourcesTabsClient from '@/features/resources/components/ResourcesTabsClient';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import type { InternshipPlatform } from '@/features/platforms/types';

export const metadata = {
    title: 'Career & Interview Preparation Resources for Freshers',
    description: 'Explore interview preparation guides, company-specific resources, skill roadmaps and career materials for students and freshers.',
    alternates: {
        canonical: '/resources',
    },
};

const PLATFORMS_TITLE = 'Internship Platforms & Resources for Students';
const PLATFORMS_DESCRIPTION = 'A comprehensive list of internship platforms, job boards, GitHub repositories, coding practice tools, startup boards, research and government programs for students and freshers.';

export default async function ResourcesDirectoryPage() {
    const feed = await getResourcesFeed();

    // Platforms directory lives on this route as ?tab=platforms (the /platforms
    // route is retired). Same CDN object, same hourly revalidation as before.
    let platforms: InternshipPlatform[] = [];
    try {
        const res = await fetch(`${CDN_URL}/internship-platforms.json`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const data = await res.json();
            platforms = Array.isArray(data.resources) ? data.resources : (Array.isArray(data) ? data : []);
        }
    } catch (error) {
        console.warn('[resources] platforms fetch failed:', error);
        platforms = [];
    }

    return (
        <Suspense fallback={null}>
            <ResourcesTabsClient
                feed={feed}
                platforms={platforms}
                platformsTitle={PLATFORMS_TITLE}
                platformsDescription={PLATFORMS_DESCRIPTION}
            />
        </Suspense>
    );
}
