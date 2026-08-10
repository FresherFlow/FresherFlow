import { ModeratorLayout } from '@/features/admin/layout/ModeratorLayout';

export default function CaptionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ModeratorLayout>{children}</ModeratorLayout>;
}
