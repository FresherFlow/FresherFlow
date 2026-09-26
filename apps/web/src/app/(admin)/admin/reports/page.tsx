import type { Metadata } from 'next';
import ReportsClient from '@/features/moderation/components/ReportsQueue';

export const metadata: Metadata = {
    title: { absolute: 'Reports | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
    return <ReportsClient />;
}
