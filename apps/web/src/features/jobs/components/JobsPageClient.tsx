'use client';

import { ComponentProps } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { TabBar } from '@/ui/TabBar';
import ForYouTab from '@/features/jobs/tabs/ForYouTab';
import SavedTab from '@/features/jobs/tabs/SavedTab';
import AppliedTab from '@/features/jobs/tabs/AppliedTab';
import AlertsTab from '@/features/jobs/tabs/AlertsTab';
import FollowingTab from '@/features/jobs/tabs/FollowingTab';
import NotificationsTab from '@/features/jobs/tabs/NotificationsTab';

type FeedInitialData = ComponentProps<typeof CategoryPage>['initialData'];

const USER_TABS = [
    { key: 'for-you', label: 'For You', href: '/jobs?tab=for-you' },
    { key: 'saved', label: 'Saved', href: '/jobs?tab=saved' },
    { key: 'applied', label: 'Applied', href: '/jobs?tab=applied' },
    { key: 'alerts', label: 'Alerts', href: '/jobs?tab=alerts' },
    { key: 'following', label: 'Following', href: '/jobs?tab=following' },
    { key: 'notifications', label: 'Notifications', href: '/jobs?tab=notifications' },
] as const;

type UserTabKey = (typeof USER_TABS)[number]['key'];

const TAB_COMPONENTS: Record<UserTabKey, React.ComponentType> = {
    'for-you': ForYouTab,
    saved: SavedTab,
    applied: AppliedTab,
    alerts: AlertsTab,
    following: FollowingTab,
    notifications: NotificationsTab,
};

function isUserTab(tab: string | null): tab is UserTabKey {
    return USER_TABS.some((t) => t.key === tab);
}

/**
 * /jobs is the single app page: the public feed by default, and the
 * signed-in workspaces (for-you, saved, applied, alerts, following,
 * notifications) as ?tab= views. A Breadcrumb trail (Jobs / Saved)
 * replaces the old pill bar — the sidebar already shows where you are.
 */
export default function JobsPageClient({ initialData }: { initialData: FeedInitialData }) {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    if (isUserTab(tab)) {
        const TabContent = TAB_COMPONENTS[tab];
        // Following is a companies feature, not a jobs one — breadcrumb
        // roots at Companies so the trail reads Companies / Following.
        const isCompanyTab = tab === 'following';
        return (
            <UsernameGate>
                <TabBar
                    variant="breadcrumb"
                    rootLabel={isCompanyTab ? 'Companies' : 'Jobs'}
                    rootHref={isCompanyTab ? '/companies' : '/jobs'}
                    items={[...USER_TABS]}
                    activeKey={tab}
                />
                <TabContent />
            </UsernameGate>
        );
    }

    return <CategoryPage type={null} initialData={initialData} />;
}
