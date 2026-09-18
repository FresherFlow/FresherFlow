import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import {
    buildTaxonomyRegistry,
    TaxonomyItem,
    yearBoardSlug,
} from '@/features/opportunities/lib/taxonomyRegistry';

// On-demand revalidation via /api/revalidate — same policy as the feed routes.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Browse All Job Boards | Jobs by Role, City, Skill & Batch',
    description: 'Every FresherFlow job board in one directory: roles, cities, skills, batch years and role×city boards — all built from the live feed.',
    alternates: {
        canonical: '/jobs/browse',
    },
    openGraph: {
        title: 'Browse All Job Boards | FresherFlow',
        description: 'Every FresherFlow job board in one directory: roles, cities, skills, batch years and role×city boards.',
        type: 'website',
        images: [{ url: '/main.png', width: 1200, height: 630, alt: 'FresherFlow job boards directory' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Browse All Job Boards | FresherFlow',
        description: 'Every FresherFlow job board in one directory: roles, cities, skills, batch years and role×city boards.',
        images: ['/main.png'],
    },
};

function byCountDesc(a: TaxonomyItem, b: TaxonomyItem) {
    return b.count - a.count;
}

function BoardCard({ label, href, count }: { label: string; href: string; count: number }) {
    return (
        <Link
            href={href}
            className="group flex items-center justify-between gap-3 px-4 py-3.5 bg-card hover:bg-muted/50 border border-border/60 rounded-lg transition-colors"
        >
            <span className="min-w-0 truncate text-base font-medium text-foreground capitalize group-hover:text-primary transition-colors">
                {label}
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs font-medium uppercase tracking-wide tabular-nums text-muted-foreground">
                {count.toLocaleString('en-IN')} {count === 1 ? 'Job' : 'Jobs'}
            </span>
        </Link>
    );
}

function DirectorySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {children}
            </div>
        </section>
    );
}

export default async function BrowseJobsPage() {
    // Lightweight index — board directory only needs count/card fields.
    const feed = await fetchFeedIndex(false, undefined, true);
    const registry = buildTaxonomyRegistry(feed?.opportunities || []);

    const roles = Array.from(registry.roles.values()).sort(byCountDesc).slice(0, 12);
    const cities = Array.from(registry.cities.values()).sort(byCountDesc).slice(0, 12);
    const skills = Array.from(registry.skills.values()).sort(byCountDesc).slice(0, 12);
    const combos = Array.from(registry.combos.values()).sort((a, b) => b.count - a.count).slice(0, 8);
    const years = Array.from(registry.years.keys()).sort((a, b) => b - a).slice(0, 6);
    const hasAnyBoard =
        roles.length > 0 || cities.length > 0 || skills.length > 0 || combos.length > 0 || years.length > 0;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">
            <header className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    Browse All Job Boards
                </h1>
                <p className="text-base text-muted-foreground font-medium max-w-2xl">
                    Every board in one directory — roles, cities, skills, batch years and combined
                    role×city pages, all generated from the live feed.
                </p>
            </header>

            {!hasAnyBoard && (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
                    The job board directory is being refreshed. Check back shortly.
                </div>
            )}

            {combos.length > 0 && (
                <DirectorySection title="Role × City Boards">
                    {combos.map(c => (
                        <BoardCard
                            key={`${c.roleSlug}-in-${c.citySlug}`}
                            label={`${c.roleLabel} in ${c.cityLabel}`}
                            href={`/jobs/${c.roleSlug}-in-${c.citySlug}`}
                            count={c.count}
                        />
                    ))}
                </DirectorySection>
            )}

            {roles.length > 0 && (
                <DirectorySection title="By Role">
                    {roles.map(r => (
                        <BoardCard key={r.slug} label={r.label} href={`/jobs/${r.slug}-jobs`} count={r.count} />
                    ))}
                </DirectorySection>
            )}

            {cities.length > 0 && (
                <DirectorySection title="By City">
                    {cities.map(c => (
                        <BoardCard key={c.slug} label={c.label} href={`/jobs/${c.slug}-jobs`} count={c.count} />
                    ))}
                </DirectorySection>
            )}

            {skills.length > 0 && (
                <DirectorySection title="By Skill">
                    {skills.map(s => (
                        <BoardCard key={s.slug} label={s.label} href={`/jobs/${s.slug}-jobs`} count={s.count} />
                    ))}
                </DirectorySection>
            )}

            {years.length > 0 && (
                <DirectorySection title="By Batch Year">
                    {years.map(y => (
                        <BoardCard key={y} label={`${y} Batch`} href={`/jobs/${yearBoardSlug(y)}`} count={registry.years.get(y) ?? 0} />
                    ))}
                </DirectorySection>
            )}
        </div>
    );
}

