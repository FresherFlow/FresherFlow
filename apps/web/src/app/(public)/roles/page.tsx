import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import Link from 'next/link';
import { ArrowRightIcon, BuildingOfficeIcon, CurrencyRupeeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { getOpportunityDisplaySalary } from '@/features/opportunities/domain/opportunityDisplay';

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

type RoleIntel = {
    slug: string;
    name: string;
    count: number;
    skills: Record<string, number>;
    companies: Record<string, number>;
    salaries: Record<string, number>;
};

export default async function RolesIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    const stats = new Map<string, RoleIntel>();
    for (const [slug, roleInfo] of Object.entries(ROLE_OVERRIDES)) {
        stats.set(slug, { slug, name: roleInfo.label, count: 0, skills: {}, companies: {}, salaries: {} });
    }

    for (const opp of opportunities) {
        const titleLower = (opp.title || '').toLowerCase();
        const jfSlug = opp.jobFunction ? slugify(opp.jobFunction) : null;

        for (const [slug, roleInfo] of Object.entries(ROLE_OVERRIDES)) {
            if (jfSlug === slug || roleInfo.keywords.some(kw => titleLower.includes(kw))) {
                const stat = stats.get(slug)!;
                stat.count++;

                // Skills
                for (const skill of opp.requiredSkills || []) {
                    if (!skill) continue;
                    const cleanSkill = skill.trim();
                    stat.skills[cleanSkill] = (stat.skills[cleanSkill] || 0) + 1;
                }

                // Company
                if (opp.company) {
                    const company = opp.company.trim();
                    stat.companies[company] = (stat.companies[company] || 0) + 1;
                }

                // Salary
                const salaryStr = getOpportunityDisplaySalary(opp as any);
                if (salaryStr && !salaryStr.toLowerCase().includes('not disclosed') && !salaryStr.toLowerCase().includes('unpaid')) {
                    stat.salaries[salaryStr] = (stat.salaries[salaryStr] || 0) + 1;
                }
            }
        }
    }

    const sorted = Array.from(stats.values())
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-background font-sans">
            <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Roles' }]} />
                </HeaderPortal>

                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Top Fresher Roles — {monthYear}</h1>
                    <p className="text-muted-foreground">Intelligence on the most in-demand roles, skills, and salaries right now.</p>
                </div>

                <div className="grid gap-4 mt-8">
                    {sorted.map(role => {
                        const topSkills = Object.entries(role.skills).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
                        const topCompanies = Object.entries(role.companies).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
                        const topSalary = Object.entries(role.salaries).sort((a, b) => b[1] - a[1])[0]?.[0];

                        return (
                            <div key={role.slug} className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                            {role.name}
                                        </h2>
                                        <p className="text-sm font-medium text-primary mt-1">{role.count} open roles</p>
                                    </div>
                                    <Link href={`/jobs?role=${role.slug}`} className="shrink-0 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" aria-label={`Browse ${role.name} jobs`}>
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </Link>
                                    <Link href={`/jobs?role=${role.slug}`} className="absolute inset-0 z-10" aria-hidden="true" />
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-2">
                                    {topSkills.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <SparklesIcon className="w-3.5 h-3.5" />
                                                <span>Top Skills</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {topSkills.map(skill => (
                                                    <span key={skill} className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {topCompanies.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <BuildingOfficeIcon className="w-3.5 h-3.5" />
                                                <span>Top Hiring</span>
                                            </div>
                                            <p className="text-sm font-medium text-foreground/90 leading-snug">
                                                {topCompanies.join(', ')}
                                            </p>
                                        </div>
                                    )}

                                    {topSalary && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <CurrencyRupeeIcon className="w-3.5 h-3.5" />
                                                <span>Avg Salary</span>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground/90">
                                                {topSalary}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
