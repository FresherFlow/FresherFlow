'use client';

import { useSearchParams } from 'next/navigation';
import { TabBar } from '@/ui/TabBar';
import { ResourcePageView } from '@/features/resources/components/ResourcePageView';
import { PlatformsPageView } from '@/features/platforms/components/PlatformsPageView';
import type { InternshipPlatform } from '@/features/platforms/types';
import type { ResourcesFeed } from '@fresherflow/types';

const RESOURCE_TABS = [
    { key: 'library', label: 'Guides', href: '/resources?tab=library' },
    { key: 'platforms', label: 'Platforms', href: '/resources?tab=platforms' },
] as const;

type ResourceTabKey = (typeof RESOURCE_TABS)[number]['key'];

interface ResourcesTabsClientProps {
    feed: ResourcesFeed;
    platforms: InternshipPlatform[];
    platformsTitle: string;
    platformsDescription: string;
}

/**
 * /resources is one page: the guides library and the internship platforms
 * directory are ?tab= views (the /platforms route now redirects here)
 * on one shared TabBar.
 */
export default function ResourcesTabsClient({
    feed,
    platforms,
    platformsTitle,
    platformsDescription,
}: ResourcesTabsClientProps) {
    const searchParams = useSearchParams();
    const rawTab = searchParams.get('tab');
    const active: ResourceTabKey = RESOURCE_TABS.some((t) => t.key === rawTab)
        ? (rawTab as ResourceTabKey)
        : 'library';

    return (
        <>
            <TabBar variant="tabs" items={[...RESOURCE_TABS]} activeKey={active} className="mx-auto w-full max-w-7xl px-4 pt-6" />

            {active === 'platforms' ? (
                <PlatformsPageView
                    resources={platforms}
                    title={platformsTitle}
                    description={platformsDescription}
                />
            ) : (
                <ResourcePageView feed={feed} />
            )}
        </>
    );
}
