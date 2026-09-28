'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { OverviewTab } from './_components/OverviewTab';
import { NotificationsSummary } from './_components/NotificationsSummary';
import AnalyticsClient from '../analytics/AnalyticsClient';
import ReportsClient from '@/features/moderation/components/ReportsQueue';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
    { id: 'notifications', label: 'Notifications' },
] as const;

type DashboardTabId = (typeof TABS)[number]['id'];

function isDashboardTabId(value: string): value is DashboardTabId {
    return TABS.some((tab) => tab.id === value);
}

function DashboardHubContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawTab = searchParams.get('tab') ?? 'overview';
    const activeTab: DashboardTabId = isDashboardTabId(rawTab) ? rawTab : 'overview';

    const handleTabChange = (tabId: string) => {
        router.push(`/admin/dashboard?tab=${tabId}`);
    };

    /* No page-level `pt-*`: the shell's content band already reserves the
       fixed MobileTopNav (`AdminLayoutClient.tsx:62` — `pt-14` below `md`,
       `md:pt-18` up to `lg`, `lg:pt-0`). This page's own `pt-16` stacked on
       that and opened a ~80px empty band on mobile. Bottom padding clears
       the fixed AdminBottomNav; `md:pb-8` takes over from `md`. */
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-4 flex-1 min-h-0 overflow-y-auto p-4 md:p-8 text-foreground w-full font-sans antialiased relative z-0">
            {/* No page-level `h1`, and no Download button. `TopHeaderBar`
                (desktop) and `MobileTopNav` (mobile) both already print the
                route name, so this block's own "Dashboard" made it appear
                twice; the reference's Download is an unwired placeholder, and
                ours exported the *listings* CSV from the dashboard, which is
                not a dashboard action. Export lives on the listings header
                where the data is. The whole row went with the h1 — it had no
                description and no actions left to hold. */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList>
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <TabsContent value="overview" className="space-y-4">
                    <OverviewTab />
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4">
                    <AnalyticsClient />
                </TabsContent>
                <TabsContent value="reports" className="space-y-4">
                    <ReportsClient />
                </TabsContent>
                <TabsContent value="notifications" className="space-y-4">
                    <NotificationsSummary />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AdminDashboardHub() {
    return (
        <Suspense fallback={<div className="p-4 md:p-6 text-sm text-muted-foreground">Loading dashboard...</div>}>
            <DashboardHubContent />
        </Suspense>
    );
}
