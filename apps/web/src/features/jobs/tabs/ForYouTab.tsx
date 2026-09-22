'use client';

import DashboardClient from '@/features/dashboard/components/DashboardClient';

/**
 * "For You" tab on /jobs — the personalized dashboard feed.
 * Renders without server initialData; DashboardClient hydrates from the CDN feed.
 */
export default function ForYouTab() {
    return <DashboardClient />;
}
