import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient, DirectoryEntity } from '@/ui/DirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Role',
    description: 'Find verified fresher jobs, internships, and walk-in drives by job role. Explore opportunities for Software Engineer, Data Analyst, Product Manager, and more.',
    alternates: { canonical: `${SITE_URL}/roles` },
};

export default async function RolesIndexPage() {
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];

    // Extract all roles with job counts
    const roleCounts: Record<string, DirectoryEntity> = {};
    for (const opp of opportunities) {
        const title = opp.title; // Using title as role
        if (!title) continue;
        const slug = slugify(title);
        if (!roleCounts[slug]) {
            roleCounts[slug] = { name: title, count: 0, slug };
        }
        roleCounts[slug].count += 1;
    }

    // Sort by count desc, then alpha
    const sorted = Object.values(roleCounts)
        .filter((data) => data.count >= 1)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Roles' }]} />
                </HeaderPortal>

                <DirectoryClient 
                    title="Browse Jobs by Role"
                    description="Find verified fresher jobs and internships matching your targeted career path."
                    data={sorted}
                    urlPrefix="/roles/"
                />
            </main>
        </div>
    );
}
