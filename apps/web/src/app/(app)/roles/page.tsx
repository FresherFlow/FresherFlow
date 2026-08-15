import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient, DirectoryEntity } from '@/ui/DirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs by Role | Entry-Level Careers',
    description: 'Explore verified fresher jobs and internships by role, including software development, data analytics, testing, support, sales and more.',
    alternates: { canonical: `${SITE_URL}/roles` },
};

const ROLE_OVERRIDES: Record<string, { label: string; keywords: string[] }> = {
    'software-engineer': {
        label: 'Software Engineer',
        keywords: ['software engineer', 'software developer', 'sde', 'full stack', 'backend developer', 'frontend developer', 'programmer', 'developer'],
    },
    'data-analyst': {
        label: 'Data Analyst',
        keywords: ['data analyst', 'bi analyst', 'data analytics', 'data scientist', 'ml engineer'],
    },
    'business-analyst': {
        label: 'Business Analyst',
        keywords: ['business analyst', 'product analyst', 'consultant', 'ba '],
    },
    'frontend-developer': {
        label: 'Frontend Developer',
        keywords: ['frontend developer', 'frontend engineer', 'ui developer', 'web developer'],
    },
    'test-engineer': {
        label: 'Test Engineer',
        keywords: ['test engineer', 'qa', 'quality assurance', 'sdet', 'automation engineer', 'tester'],
    },
};

const ROLE_MIN_JOBS = 5;

export default async function RolesIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    // Count by keyword cluster, not exact title slug
    const counts = new Map<string, number>();
    for (const opp of opportunities) {
        const titleLower = (opp.title || '').toLowerCase();
        const jfSlug = opp.jobFunction ? slugify(opp.jobFunction) : null;

        for (const [slug, roleInfo] of Object.entries(ROLE_OVERRIDES)) {
            if (jfSlug === slug || roleInfo.keywords.some(kw => titleLower.includes(kw))) {
                counts.set(slug, (counts.get(slug) ?? 0) + 1);
            }
        }
    }

    const sorted: DirectoryEntity[] = Object.entries(ROLE_OVERRIDES)
        .map(([slug, roleInfo]) => ({
            name: roleInfo.label,
            count: counts.get(slug) ?? 0,
            slug,
        }))
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
