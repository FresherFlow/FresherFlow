import { Suspense } from 'react';
import SettingsTabsClient from '@/features/settings/SettingsTabsClient';

// One account page with tabs: profile, account, referrals, feedback.
// ?tab= is read client-side so the route stays static and cache-friendly.
export default function AccountPage() {
    return (
        <Suspense fallback={null}>
            <SettingsTabsClient />
        </Suspense>
    );
}
