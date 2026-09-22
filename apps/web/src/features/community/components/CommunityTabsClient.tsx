'use client';

import { ComponentType } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabBar } from '@/ui/TabBar';
import { CommunityFeedClient } from '@/features/community/components/CommunityFeedClient';
import { ReferralBoardClient } from '@/features/community/components/ReferralBoardClient';
import { SalaryReportsClient } from '@/features/community/components/SalaryReportsClient';
import { SavedSearchesClient } from '@/features/community/components/SavedSearchesClient';
import { RoomsDirectory } from '@/features/rooms/RoomsDirectory';

const COMMUNITY_TABS = [
    { key: 'discussions', label: 'Discussions', href: '/community?tab=discussions' },
    { key: 'referrals', label: 'Referrals', href: '/community?tab=referrals' },
    { key: 'salary', label: 'Salary & Offers', href: '/community?tab=salary' },
    { key: 'rooms', label: 'Rooms', href: '/community?tab=rooms' },
    { key: 'saved-searches', label: 'Saved Searches', href: '/community?tab=saved-searches' },
] as const;

type CommunityTabKey = (typeof COMMUNITY_TABS)[number]['key'];

const TAB_COMPONENTS: Record<CommunityTabKey, ComponentType> = {
    discussions: CommunityFeedClient,
    referrals: ReferralBoardClient,
    salary: SalaryReportsClient,
    rooms: RoomsDirectory,
    'saved-searches': SavedSearchesClient,
};

function resolveTab(tab: string | null): CommunityTabKey {
    return COMMUNITY_TABS.some((t) => t.key === tab) ? (tab as CommunityTabKey) : 'discussions';
}

/**
 * /community is one page: discussions, referral board, salary reports, rooms
 * and saved searches are ?tab= views on one shared pill TabBar, with a
 * Breadcrumb (Community / Referrals) for clarity.
 */
export default function CommunityTabsClient() {
    const searchParams = useSearchParams();
    const active = resolveTab(searchParams.get('tab'));
    const TabContent = TAB_COMPONENTS[active];

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Community</h1>
                <p className="text-sm text-muted-foreground">
                    Discuss job opportunities, share experiences, and connect with fellow freshers.
                </p>
                <TabBar variant="tabs" items={[...COMMUNITY_TABS]} activeKey={active} className="px-0 pt-0 max-w-none" />
            </header>
            <TabContent />
        </main>
    );
}
