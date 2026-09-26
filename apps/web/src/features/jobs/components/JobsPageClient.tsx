'use client';

import { ComponentProps } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { HeaderPortal } from '@/features/navigation/HeaderPortal';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/ui/Breadcrumb';
import ForYouTab from '@/features/jobs/tabs/ForYouTab';
import SavedTab from '@/features/jobs/tabs/SavedTab';
import AppliedTab from '@/features/jobs/tabs/AppliedTab';
import AlertsTab from '@/features/jobs/tabs/AlertsTab';
import FollowingTab from '@/features/companies/components/FollowingTab';
import NotificationsTab from '@/features/jobs/tabs/NotificationsTab';
import type { CompanyFollowSummary } from '@/features/companies/types';

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

// Following is deliberately absent: it takes props (live role counts), so it is
// rendered directly below rather than through the props-less map.
const TAB_COMPONENTS: Record<Exclude<UserTabKey, 'following'>, React.ComponentType> = {
    'for-you': ForYouTab,
    saved: SavedTab,
    applied: AppliedTab,
    alerts: AlertsTab,
    notifications: NotificationsTab,
};

function isUserTab(tab: string | null): tab is UserTabKey {
    return USER_TABS.some((t) => t.key === tab);
}

/**
 * Trail rendered by the user tabs. Portaled into the SiteHeader on desktop
 * (replacing the feed fallback so the header is the single trail), and kept
 * in-page below `lg` where SiteHeader does not render.
 */
function UserTabTrail({ rootLabel, rootHref, label }: { rootLabel: string; rootHref: string; label: string }) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href={rootHref}>{rootLabel}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
}

/**
 * /jobs is the single app page: the public feed by default, and the
 * signed-in workspaces (for-you, saved, applied, alerts, following,
 * notifications) as ?tab= views. The tab trail lives in the header —
 * the sidebar already shows where you are.
 */
export default function JobsPageClient({
    initialData,
    companyDirectory,
}: {
    initialData: FeedInitialData;
    companyDirectory: Record<string, CompanyFollowSummary>;
}) {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    if (isUserTab(tab)) {
        // For You has its own guest preview — do not gate at shell so unauth
        // curl/browser still sees For You · Personalized and sample cards.
        // ForYouTab itself checks useAuth and shows the teaser when !user.
        if (tab === 'for-you') {
            return (
                <>
                    <HeaderPortal>
                        <UserTabTrail rootLabel="Jobs" rootHref="/jobs" label="For You" />
                    </HeaderPortal>
                    <div className="lg:hidden w-full max-w-7xl mx-auto px-3 md:px-6 pt-4">
                        <UserTabTrail rootLabel="Jobs" rootHref="/jobs" label="For You" />
                    </div>
                    <ForYouTab />
                </>
            );
        }

        // Following is a companies feature, not a jobs one — the trail
        // roots at Companies so it reads Companies / Following.
        const isCompanyTab = tab === 'following';
        const rootLabel = isCompanyTab ? 'Companies' : 'Jobs';
        const rootHref = isCompanyTab ? '/companies' : '/jobs';
        const label = USER_TABS.find((t) => t.key === tab)?.label ?? tab;

        if (tab === 'following') {
            return (
                <UsernameGate>
                    <HeaderPortal>
                        <UserTabTrail rootLabel={rootLabel} rootHref={rootHref} label={label} />
                    </HeaderPortal>
                    {/* SiteHeader is lg+ only — keep the trail in-page below lg. */}
                    <div className="lg:hidden w-full max-w-7xl mx-auto px-3 md:px-6 pt-4">
                        <UserTabTrail rootLabel={rootLabel} rootHref={rootHref} label={label} />
                    </div>
                    <FollowingTab companyDirectory={companyDirectory} />
                </UsernameGate>
            );
        }

        const TabContent = TAB_COMPONENTS[tab];

        return (
            <UsernameGate>
                <HeaderPortal>
                    <UserTabTrail rootLabel={rootLabel} rootHref={rootHref} label={label} />
                </HeaderPortal>
                {/* SiteHeader is lg+ only — keep the trail in-page below lg. */}
                <div className="lg:hidden w-full max-w-7xl mx-auto px-3 md:px-6 pt-4">
                    <UserTabTrail rootLabel={rootLabel} rootHref={rootHref} label={label} />
                </div>
                <TabContent />
            </UsernameGate>
        );
    }

    return <CategoryPage type={null} initialData={initialData} />;
}
