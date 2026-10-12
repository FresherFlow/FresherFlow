import type { Metadata } from 'next';
import AdminResourcesClient from '@/features/admin/components/AdminResourcesClient';
import { fetchSkillsMetadata, fetchCompaniesMetadata } from '@/lib/api/cdnFeed';

export const metadata: Metadata = {
    title: { absolute: 'Resources | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export default async function AdminResourcesPage() {
    let initialSkills: string[] = [];
    let initialCompanies: string[] = [];

    // Use the shared CDN feed helpers, not raw fetch (apps/web/AGENTS.md: never
    // raw-fetch when a wrapper exists, and CDN feed fetches must not be
    // `no-store` in a production path). The helpers sign the URL, cache with
    // `force-cache` under the `skills-metadata` / `companies-metadata` tags, and
    // never throw — they resolve `null` on failure, which is the empty-list
    // state below. There is no timer: a publish busts the tag via
    // /api/revalidate.
    const [skills, companies] = await Promise.all([
        fetchSkillsMetadata(),
        fetchCompaniesMetadata(),
    ]);

    if (Array.isArray(skills)) initialSkills = skills;
    if (Array.isArray(companies)) {
        initialCompanies = companies
            .map((c) => (typeof c === 'string' ? c : c?.name || ''))
            .filter(Boolean);
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
