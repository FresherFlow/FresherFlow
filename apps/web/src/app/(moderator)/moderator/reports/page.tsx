import type { Metadata } from 'next';
import ReportsQueue from '@/features/moderation/components/ReportsQueue';

export const metadata: Metadata = {
    title: { absolute: 'Reports | Moderation' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
    return <ReportsQueue auth={{ isAuthenticated: true }} />;
}
