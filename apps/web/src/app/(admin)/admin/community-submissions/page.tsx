import type { Metadata } from 'next';
import CommunitySubmissionsClient from '@/features/moderation/components/CommunitySubmissionsQueue';

export const metadata: Metadata = {
    title: { absolute: 'Community Submissions | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export default function Page() {
    return <CommunitySubmissionsClient />;
}
