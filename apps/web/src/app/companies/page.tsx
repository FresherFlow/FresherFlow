import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils';
import { Breadcrumb } from '@/ui/Breadcrumb';
import CompanyLogo from '@/ui/CompanyLogo';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Browse Companies Hiring Freshers',
    description: 'Explore all companies actively hiring freshers in India. Find verified jobs and internships at top MNCs, startups, and government organisations.',
    alternates: { canonical: `${SITE_URL || 'https://fresherflow.in'}/companies` },
};

export default async function CompaniesIndexPage() {
    const [companyList, feed] = await Promise.all([
        fetchCompaniesMetadata(),
        fetchBootstrapFeed(),
    ]);

    const opportunities = feed?.opportunities || [];

    // Build company data: count active jobs per company + grab logo/website
    const companyData: Record<string, {
        name: string;
        slug: string;
        count: number;
        logoUrl?: string | null;
        website?: string | null;
    }> = {};

    for (const opp of opportunities) {
        if (!opp.company) continue;
        const slug = slugify(opp.company);
        if (!companyData[slug]) {
            companyData[slug] = {
                name: opp.company,
                slug,
                count: 0,
                logoUrl: opp.companyLogoUrl,
                website: opp.companyWebsite,
            };
        }
        companyData[slug].count++;
    }

    // Merge with directory (companies with no active jobs still listed)
    const directory = (companyList || []) as unknown as (string | { name: string })[];
    for (const item of directory) {
        const name = typeof item === 'string' ? item : item?.name;
        if (!name) continue;
        const slug = slugify(name);
        if (!companyData[slug]) {
            companyData[slug] = { name, slug, count: 0 };
        }
    }

    // Sort: active first (by count desc), then alphabetically
    const companies = Object.values(companyData)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // Group alphabetically
    const groups: Record<string, typeof companies> = {};
    for (const co of companies) {
        const letter = co.name[0].toUpperCase();
        const key = /[A-Z]/.test(letter) ? letter : '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push(co);
    }

    const letters = Object.keys(groups).sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    const totalJobs = opportunities.length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />

                {/* Header */}
                <div className="border-b border-border/60 pb-6 space-y-2">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                        Companies Hiring Freshers
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Every company currently listing verified entry-level roles on FresherFlow.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {totalJobs} actively hiring
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                            {companies.length} total companies
                        </span>
                    </div>
                </div>

                {/* Letter jump nav */}
                <div className="flex flex-wrap gap-1.5">
                    {letters.map(letter => (
                        <a
                            key={letter}
                            href={`#co-${letter}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {/* Company groups */}
                <div className="space-y-10">
                    {letters.map(letter => (
                        <div key={letter} id={`co-${letter}`} className="scroll-mt-24 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-foreground">{letter}</span>
                                <span className="text-xs font-semibold text-muted-foreground">{groups[letter].length}</span>
                                <div className="flex-1 h-px bg-border/60" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {groups[letter].map((co) => (
                                    <Link
                                        key={co.slug}
                                        href={`/companies/${co.slug}`}
                                        className="group flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-primary/5 border border-border hover:border-primary/30 transition-all"
                                    >
                                        <CompanyLogo
                                            companyName={co.name}
                                            companyLogoUrl={co.logoUrl}
                                            companyWebsite={co.website}
                                            className="w-9 h-9 rounded-lg shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                {co.name}
                                            </div>
                                            <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                {co.count > 0 ? (
                                                    <span className="text-primary font-semibold">{co.count} active {co.count === 1 ? 'listing' : 'listings'}</span>
                                                ) : (
                                                    'No active listings'
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
