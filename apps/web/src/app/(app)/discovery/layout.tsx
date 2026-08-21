import { ModeratorLayout } from '@/features/admin/layout/ModeratorLayout';

export default function DiscoveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ModeratorLayout>{children}</ModeratorLayout>;
}
