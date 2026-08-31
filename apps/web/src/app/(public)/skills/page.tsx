import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import Link from 'next/link';
import { ArrowRightIcon, BuildingOfficeIcon, CurrencyRupeeIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { getOpportunityDisplaySalary } from '@/features/opportunities/domain/opportunityDisplay';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Skill | Fresher Jobs & Internships',
    description: 'Find verified fresher jobs and internships based on technical and professional skills, technologies and tools.',
    alternates: { canonical: `${SITE_URL}/skills` },
};

type SkillIntel = {
    slug: string;
    name: string;
    count: number;
    roles: Record<string, number>;
    companies: Record<string, number>;
    salaries: Record<string, number>;
};

export default async function SkillsIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    const customSlugify = (str: string) => {
        const clean = str.replace(/\+/g, 'pp').replace(/#/g, 'sharp').replace(/^\./, 'dot-');
        return slugify(clean);
    };

    const stats = new Map<string, SkillIntel>();

    for (const opp of opportunities) {
        for (const skill of opp.requiredSkills || []) {
            if (!skill) continue;
            const cleanSkill = skill.trim();
            const slug = customSlugify(cleanSkill);
            
            if (!stats.has(slug)) {
                stats.set(slug, { slug, name: cleanSkill, count: 0, roles: {}, companies: {}, salaries: {} });
            }
            
            const stat = stats.get(slug)!;
            stat.count++;

            // Roles
            const roleName = opp.normalizedRole || opp.title;
            if (roleName) {
                const cleanRole = roleName.trim();
                stat.roles[cleanRole] = (stat.roles[cleanRole] || 0) + 1;
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

    const sorted = Array.from(stats.values())
        .filter(s => s.count >= 5)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 50);

    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-background font-sans">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Skills' }]} />
                </HeaderPortal>

                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Top Tech Skills — {monthYear}</h1>
                    <p className="text-muted-foreground">Intelligence on the most in-demand skills, top hiring companies, and salaries.</p>
                </div>

                <div className="grid gap-4 mt-8">
                    {sorted.map(skill => {
                        const topRoles = Object.entries(skill.roles).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
                        const topCompanies = Object.entries(skill.companies).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
                        const topSalary = Object.entries(skill.salaries).sort((a, b) => b[1] - a[1])[0]?.[0];

                        return (
                            <div key={skill.slug} className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                            {skill.name}
                                        </h2>
                                        <p className="text-sm font-medium text-primary mt-1">{skill.count} open roles</p>
                                    </div>
                                    <Link href={`/jobs?skill=${skill.slug}`} className="shrink-0 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" aria-label={`Browse ${skill.name} jobs`}>
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </Link>
                                    <Link href={`/jobs?skill=${skill.slug}`} className="absolute inset-0 z-10" aria-hidden="true" />
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-2">
                                    {topRoles.length > 0 && (
                                         <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <IdentificationIcon className="w-3.5 h-3.5" />
                                                <span>Top Roles</span>
                                            </div>
                                            <ul className="text-sm font-medium text-foreground/90 space-y-0.5">
                                                {topRoles.map(r => <li key={r} className="line-clamp-1">{r}</li>)}
                                            </ul>
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
            </div>
        </div>
    );
}
