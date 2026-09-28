'use client';

import { ComponentType, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TabBar } from '@/ui/TabBar';
import { CommunityFeedClient } from '@/features/community/components/CommunityFeedClient';
import { ReferralBoardClient } from '@/features/community/components/ReferralBoardClient';
import { SalaryReportsClient } from '@/features/community/components/SalaryReportsClient';
import { RoomsDirectory } from '@/features/rooms/RoomsDirectory';

const COMMUNITY_TABS = [
    { key: 'discussions', label: 'Discussions', href: '/community?tab=discussions' },
    { key: 'referrals', label: 'Referrals', href: '/community?tab=referrals' },
    { key: 'salary', label: 'Salary & Offers', href: '/community?tab=salary' },
    { key: 'rooms', label: 'Rooms', href: '/community?tab=rooms' },
] as const;

type CommunityTabKey = (typeof COMMUNITY_TABS)[number]['key'];

const TAB_COMPONENTS: Record<CommunityTabKey, ComponentType> = {
    discussions: CommunityFeedClient,
    referrals: ReferralBoardClient,
    salary: SalaryReportsClient,
    rooms: RoomsDirectory,
};

function resolveTab(tab: string | null): CommunityTabKey {
    return COMMUNITY_TABS.some((t) => t.key === tab) ? (tab as CommunityTabKey) : 'discussions';
}

/**
 * /community is one page: discussions, referral board, salary reports and
 * rooms are ?tab= views on one shared pill TabBar. Saved searches moved to
 * /jobs?tab=searches — a legacy ?tab=saved-searches is redirected there.
 */
export default function CommunityTabsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawTab = searchParams.get('tab');

    useEffect(() => {
        if (rawTab === 'saved-searches') {
            router.replace('/jobs?tab=searches');
        }
    }, [rawTab, router]);

    const active = resolveTab(rawTab);
    const TabContent = TAB_COMPONENTS[active];

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Community</h1>
                <p className="text-sm text-muted-foreground">
                    Discuss job opportunities, share experiences, and connect with fellow freshers.
                </p>
                <TabBar items={[...COMMUNITY_TABS]} activeKey={active} />
            </header>
            <TabContent />
        </main>
    );
}
