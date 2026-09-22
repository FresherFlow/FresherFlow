import type { Metadata } from 'next';
import { Suspense } from 'react';
import CommunityTabsClient from '@/features/community/components/CommunityTabsClient';

export const metadata: Metadata = {
    title: 'Community',
    description: 'Discuss jobs, share experiences, and connect with freshers.',
    alternates: {
        canonical: '/community',
    },
};

// Discussion feed by default; referral board, salary reports, rooms and saved
// searches are ?tab= views so the route stays a single page.
export default function CommunityPage() {
    return (
        <Suspense fallback={null}>
            <CommunityTabsClient />
        </Suspense>
    );
}
