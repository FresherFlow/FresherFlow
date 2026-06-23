import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import JobCard from '@/features/opportunities/components/JobCard';
import { GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { PageTagLinks } from '@/ui/PageTagLinks';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils';
import { getCompanyDescription, TIER_A_SLUGS } from '@/features/companies/utils/companyContent';

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const { fetchCompaniesMetadata } = await import('@/lib/api/cdnFeed');
        const companyDirectory = await fetchCompaniesMetadata();
        if (!companyDirectory) return [];

        const seen = new Set<string>();
        const params: { name: string }[] = [];

        for (const item of companyDirectory) {
            let companyName = '';
            if (typeof item === 'string') {
                companyName = item;
            } else if (item && typeof item === 'object' && 'name' in item) {
                companyName = (item as { name: string }).name;
            }

            const slug = slugify(companyName);
            if (slug && !seen.has(slug)) {
                seen.add(slug);
                params.push({ name: slug });
            }
        }

        return params;
    } catch {
        return [];
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ name: string }> }
): Promise<Metadata> {
    const { name: encodedName } = await params;
    const slug = slugify(decodeURIComponent(encodedName));
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const canonicalUrl = `${base}/companies/${slug}`;

    const companyName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isTierA = TIER_A_SLUGS.has(slug);

    const title = `${companyName} Jobs & Internships 2026 | ${isTierA ? 'Careers Guide' : 'Fresher Jobs'}`;
    const description = `Explore verified entry-level jobs, off-campus placements, and tech internships at ${companyName} on FresherFlow. Direct official apply links, no fake listings.`;
    const ogImageUrl = `https://cdn.fresherflow.in/og/companies/${slug}.png`;

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            type: 'website',
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = await params;
    const rawName = decodeURIComponent(encodedName);
    const slug = slugify(rawName);

    if (encodedName !== slug) {
        logRouteResult('/companies/[name]', '308');
        permanentRedirect(`/companies/${slug}`);
    }

    const { fetchCompanyShard, fetchCompaniesMetadata } = await import('@/lib/api/cdnFeed');

    const companyDirectory = await fetchCompaniesMetadata();
    if (companyDirectory && companyDirectory.length > 0) {
        const knownSlugs = new Set(
            (companyDirectory as unknown as { name: string }[])
                .map(c => slugify(c?.name || ''))
                .filter(Boolean)
        );
        if (!knownSlugs.has(slug)) {
            logRouteResult('/companies/[name]', '404');
            notFound();
        }
    }

    const feed = await fetchCompanyShard(slug);
    const companyJobs = feed?.opportunities || [];

    const companyName = companyJobs[0]?.company ||
        slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const allSkills = Array.from(new Set(companyJobs.flatMap(j => j.requiredSkills || []))).filter(Boolean);
    const allLocations = Array.from(new Set(companyJobs.flatMap(j => j.locations || []))).filter(Boolean);

    const stats = {
        activeJobsCount: companyJobs.length,
        locations: allLocations,
        skills: allSkills,
        roles: Array.from(new Set(companyJobs.map(j => j.jobFunction || j.title))).filter(Boolean),
    };

    const companyDescriptionHtml = getCompanyDescription(slug, companyName, stats);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (companyJobs.length === 0) {
        logRouteResult('/companies/[name]', '200');
        return (
            <div className="min-h-screen bg-background pb-20">
                <main className="max-w-7xl mx-auto px-4 md:px-6 py-16 space-y-8">
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: companyName }]} />
                    <div className="text-center space-y-4 py-20">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">{companyName}</h1>
                        <p className="text-sm text-muted-foreground">No active listings right now. Check back soon.</p>
                        <Link href="/" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">Browse all opportunities →</Link>
                    </div>
                    <div className="border-t border-border/50 pt-8 max-w-3xl space-y-3">
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">About {companyName}</h2>
                        <div
                            className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose"
                            dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }}
                        />
                    </div>
                </main>
            </div>
        );
    }

    const firstJob = companyJobs[0];

    logRouteResult('/companies/[name]', '200');

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                {/* Breadcrumbs */}
                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies', href: '/companies' }, { label: companyName }]} />

                {/* Company Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8">
                    <div className="flex items-center gap-4">
                        <CompanyLogo
                            companyName={companyName}
                            companyWebsite={firstJob.companyWebsite}
                            companyLogoUrl={firstJob.companyLogoUrl}
                            applyLink={firstJob.applyLink}
                            isGovernment={firstJob.type === 'GOVERNMENT' || Boolean(firstJob.governmentJobDetails)}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] shrink-0"
                        />
                        <div className="space-y-1.5">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                {companyName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                                {firstJob.companyWebsite && (
                                    <a
                                        href={firstJob.companyWebsite as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                    >
                                        <GlobeAltIcon className="w-3.5 h-3.5" />
                                        Official Website
                                    </a>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <BriefcaseIcon className="w-3.5 h-3.5" />
                                    {companyJobs.length} Active Listings
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Job Cards — full width grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {companyJobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={{
                                ...job,
                                company: companyName,
                                normalizedRole: job.title,
                                salary: (job.salaryMin !== undefined && job.salaryMax !== undefined)
                                    ? { min: job.salaryMin, max: job.salaryMax }
                                    : undefined,
                            }}
                            jobId={job.id}
                            isApplied={(job.actions || []).some((a: { actionType: string }) => a.actionType === 'APPLIED')}
                        />
                    ))}
                </div>

                {/* Skills & Locations */}
                <PageTagLinks skills={allSkills} locations={allLocations} />

                {/* About — prose at the bottom */}
                <div className="border-t border-border/50 pt-8 max-w-3xl space-y-3">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">About {companyName}</h2>
                    <div
                        className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose"
                        dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }}
                    />
                </div>

            </main>
        </div>
    );
}
