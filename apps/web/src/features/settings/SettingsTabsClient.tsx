'use client';

import { useSearchParams } from 'next/navigation';
import AccountTab from '@/features/settings/tabs/AccountTab';
import ProfileEditor from '@/features/profile/components/editor/ProfileEditor';
import FeedbackTab from '@/features/settings/tabs/FeedbackTab';
import ReferralTab from '@/features/settings/tabs/ReferralTab';
import AccountOverview from '@/features/settings/AccountOverview';

const SETTINGS_TABS = [
    { key: 'profile', label: 'Profile', href: '/account?tab=profile' },
    { key: 'settings', label: 'Settings', href: '/account?tab=settings' },
    { key: 'referral', label: 'Referrals', href: '/account?tab=referral' },
    { key: 'feedback', label: 'Feedback', href: '/account?tab=feedback' },
] as const;

type SettingsTabKey = (typeof SETTINGS_TABS)[number]['key'];

const TAB_COMPONENTS: Record<SettingsTabKey, React.ComponentType> = {
    profile: ProfileEditor,
    settings: AccountTab,
    referral: ReferralTab,
    feedback: FeedbackTab,
};

/**
 * /account without ?tab= is its own page (account hub linking every
 * section). A ?tab= value renders that section directly; unknown values
 * fall back to the hub, never to a wrong section.
 */
export default function SettingsTabsClient() {
    const searchParams = useSearchParams();
    const key = searchParams.get('tab');
    const TabContent =
        key != null && key in TAB_COMPONENTS
            ? TAB_COMPONENTS[key as SettingsTabKey]
            : null;

    if (!TabContent) return <AccountOverview />;
    return <TabContent />;
}
