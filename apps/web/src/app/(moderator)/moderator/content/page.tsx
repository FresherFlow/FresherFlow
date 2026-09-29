import type { Metadata } from 'next';
import CommunitySubmissionsQueue from '@/features/moderation/components/CommunitySubmissionsQueue';

export const metadata: Metadata = {
    title: { absolute: 'Community content | Moderation' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
    return <CommunitySubmissionsQueue initialQueue="hiring-post" />;
}
