import type { Metadata } from 'next';
import AdminResourcesClient from '@/features/admin/components/AdminResourcesClient';
import { SKILLS_METADATA_URL, COMPANIES_METADATA_URL } from '@/lib/utils/runtimeConfig';

export const metadata: Metadata = {
    title: { absolute: 'Resources | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export default async function AdminResourcesPage() {
    let initialSkills: string[] = [];
    let initialCompanies: string[] = [];

    try {
        const [skillsRes, companiesRes] = await Promise.all([
            fetch(SKILLS_METADATA_URL, { next: { revalidate: 3600 } }),
            fetch(COMPANIES_METADATA_URL, { next: { revalidate: 3600 } }),
        ]);
        if (skillsRes.ok) {
            const data = await skillsRes.json();
            if (Array.isArray(data)) initialSkills = data;
        }
        if (companiesRes.ok) {
            const data = await companiesRes.json();
            if (Array.isArray(data)) {
                initialCompanies = data
                    .map((c: { name?: string } | string) => (typeof c === 'string' ? c : c?.name || ''))
                    .filter(Boolean);
            }
        }
    } catch (err) {
        console.error('Failed to fetch from CDN on server:', err);
    }

    return (
        // Fixed shell, matching /admin/users and /admin/audit: the page does not
        // scroll — it hands a bounded height down so the grid's own footer
        // (search, pagination, rows per page) is always visible and the grid body
        // is the single scroll container.
        //
        // `min-h-0` is load-bearing: as a flex child of the shell's content
        // column it is what lets this element shrink, and therefore what lets
        // the grid's `overflow-auto` engage at all. Without it the column grew to
        // its content height and the shell clipped the bottom with nowhere to
        // scroll.
        //
        // No `pt-*`: AdminLayoutClient already reserves the mobile top offset
        // with `pt-14 md:pt-18 lg:pt-0`, so restating it double-stacked the gap
        // and collided with the fixed MobileTopNav. No `pb-*` either — the fixed
        // AdminBottomNav returns null on any path containing `/resources`, so
        // there is no bar to clear on this route.
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-foreground md:p-8">
            {/* Page copy lives here, not in the client: shadcn-admin
                `features/users/index.tsx` shape — a short title and one line of
                description. The client owns the actions to its right (queue count
                and "Create resource"), which need its own state. */}
            <AdminResourcesClient
                heading={
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Resources
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Review and approve resources shared by users.
                        </p>
                    </div>
                }
                initialSkills={Array.isArray(initialSkills) ? initialSkills : []}
                initialCompanies={Array.isArray(initialCompanies) ? initialCompanies : []}
            />
        </div>
    );
}
