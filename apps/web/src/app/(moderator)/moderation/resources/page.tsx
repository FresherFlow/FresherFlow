import type { Metadata } from 'next';
import AdminResourcesClient from '@/features/admin/components/AdminResourcesClient';

export const metadata: Metadata = {
    title: { absolute: 'Resources | Moderation' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Approve pending collections or remove rejected ones. Collection authoring (create, item edits,
                deleting live collections) stays admin-only and will return a permission error here.
            </p>
            <AdminResourcesClient initialSkills={[]} initialCompanies={[]} />
        </div>
    );
}
