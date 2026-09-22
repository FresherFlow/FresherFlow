'use client';

import { useSearchParams } from 'next/navigation';
import { TabBar } from '@/ui/TabBar';
import AccountTab from '@/features/settings/tabs/AccountTab';
import ProfileTab from '@/features/settings/tabs/ProfileTab';
import FeedbackTab from '@/features/settings/tabs/FeedbackTab';
import ReferralTab from '@/features/settings/tabs/ReferralTab';

const SETTINGS_TABS = [
    { key: 'profile', label: 'Profile', href: '/account?tab=profile' },
    { key: 'settings', label: 'Settings', href: '/account?tab=settings' },
    { key: 'referral', label: 'Referrals', href: '/account?tab=referral' },
    { key: 'feedback', label: 'Feedback', href: '/account?tab=feedback' },
] as const;

type SettingsTabKey = (typeof SETTINGS_TABS)[number]['key'];

const DEFAULT_TAB: SettingsTabKey = 'settings';

const TAB_COMPONENTS: Record<SettingsTabKey, React.ComponentType> = {
    profile: ProfileTab,
    settings: AccountTab,
    referral: ReferralTab,
    feedback: FeedbackTab,
};

function resolveTab(tab: string | null): SettingsTabKey {
    return SETTINGS_TABS.some((t) => t.key === tab) ? (tab as SettingsTabKey) : DEFAULT_TAB;
}

/**
 * /settings is the single account page: profile, account & security,
 * referrals and feedback are ?tab= views. One shared pill TabBar on top,
 * plus a Breadcrumb (Settings / Profile) for clarity.
 * Each tab component keeps its own auth gate, so exactly one gate is active.
 */
export default function SettingsTabsClient() {
    const searchParams = useSearchParams();
    const active = resolveTab(searchParams.get('tab'));
    const TabContent = TAB_COMPONENTS[active];

    return (
        <>
            <TabBar variant="tabs" items={[...SETTINGS_TABS]} activeKey={active} />
            <TabContent />
        </>
    );
}
