import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import JobCard from '@/features/opportunities/components/JobCard';

import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { Card } from '@/ui/Card';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { TIER_A_SLUGS, getCompanyDescription } from '@/features/companies/utils/companyContent';
import { fetchCompanyShard, fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';
import { PageTagLinks } from '@/features/companies/components/PageTagLinks';

export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
    try {
        const companyDirectory = await fetchCompaniesMetadata(true);
        if (!companyDirectory) return [];

        // Only pre-build companies with at least 1 active job.
        const feed = await fetchBootstrapFeed(false, undefined, true);
        const activeCompanySlugs = new Set(
            (feed?.opportunities || [])
                .map((o: any) => slugify(o.company || ''))
                .filter(Boolean)
        );

        const seen = new Set<string>();
        const params: { slug: string }[] = [];

        for (const item of companyDirectory) {
            if (!item || !item.name) continue;
            const slug = item.slug || slugify(item.name);
            if (slug && !seen.has(slug) && activeCompanySlugs.has(slug)) {
                seen.add(slug);
                params.push({ slug });
            }
        }

        return params;
    } catch {
        return [];
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug: rawSlug } = await params;
    const slug = slugify(decodeURIComponent(rawSlug));
    const base = SITE_URL.replace(/\/+$/, '');
    const canonicalUrl = `${base}/companies/${slug}`;

    const companyName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isTierA = TIER_A_SLUGS.has(slug);

    const title = `${companyName} Jobs & Internships 2026 | ${isTierA ? 'Careers Guide' : 'Fresher Jobs'}`;
    const description = `Explore verified entry-level jobs, off-campus placements, and tech internships at ${companyName} on FresherFlow. Direct official apply links, no fake listings.`;
    const ogImageUrl = `${CDN_URL}/og/companies/${slug}.png`;

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

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlugParam } = await params;
    const rawSlug = decodeURIComponent(rawSlugParam);
    const properSlug = slugify(rawSlug);

    if (rawSlug !== properSlug) {
        logRouteResult('/companies/[slug]', '308');
        permanentRedirect(`/companies/${properSlug}`);
    }

    const companyDirectory = await fetchCompaniesMetadata(true);
    let targetSlug = properSlug;
    let shouldRedirectTo: string | null = null;

    if (companyDirectory && companyDirectory.length > 0) {
        let matched = companyDirectory.find(c => c && c.slug === properSlug);

        if (!matched) {
            matched = companyDirectory.find(c => c && c.name && slugify(c.name) === properSlug);
        }

        if (matched) {
            const canonicalSlug = matched.slug || slugify(matched.name || '');
            if (canonicalSlug && canonicalSlug !== properSlug) {
                logRouteResult('/companies/[slug]', '308');
                shouldRedirectTo = canonicalSlug;
            }
            targetSlug = canonicalSlug;
        } else {
            const knownSlugs = new Set(
                companyDirectory
                    .map(c => c.slug || slugify(c.name || ''))
                    .filter(Boolean)
            );
            if (!knownSlugs.has(properSlug)) {
                logRouteResult('/companies/[slug]', '404');
                notFound();
            }
        }
    }

    if (shouldRedirectTo) {
        permanentRedirect(`/companies/${shouldRedirectTo}`);
    }

    let feed = await fetchCompanyShard(targetSlug, undefined, true);
    let companyJobs = feed?.opportunities || [];

    if (companyJobs.length === 0 && targetSlug !== properSlug) {
        feed = await fetchCompanyShard(properSlug, undefined, true);
        companyJobs = feed?.opportunities || [];
        if (companyJobs.length > 0) {
            targetSlug = properSlug;
        }
    }

    const companyName = (feed as any)?.company || companyJobs[0]?.company ||
        targetSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const firstJob = companyJobs[0];

    const allSkills = Array.from(new Set(companyJobs.flatMap(j => (j as any).requiredSkills || []))).filter(Boolean);
    const allLocations = Array.from(new Set(companyJobs.flatMap(j => (j as any).locations || []))).filter(Boolean);
    const stats = { locations: allLocations, skills: allSkills };
    const companyDescriptionHtml = getCompanyDescription(targetSlug, companyName, stats);

    if (companyJobs.length === 0) {
        logRouteResult('/companies/[slug]', '200');
        return (
            <div className="bg-background pb-10 font-sans">
                <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                    <div className="flex items-center justify-between gap-4 pb-2.5">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <CompanyLogo
                                companyName={companyName}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl shrink-0 border border-border/40 bg-background p-0.5 object-contain"
                            />
                            <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight leading-tight truncate">
                                {companyName}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <CompanyFollowButton companySlug={targetSlug} companyName={companyName} />
                        </div>
                    </div>

                    <Card className="text-center space-y-3 py-12 p-6">
                        <p className="text-sm text-muted-foreground">No active job listings for {companyName} right now.</p>
                        <Link href="/jobs" className="inline-block text-sm font-semibold text-primary hover:underline">
                            Browse all opportunities →
                        </Link>
                    </Card>

                    <Card className="p-6 md:p-8 space-y-3 shadow-none bg-muted/20 border-border/40 mt-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About {companyName}</h2>
                        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose" dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }} />
                    </Card>
                </main>
            </div>
        );
    }

    logRouteResult('/companies/[slug]', '200');

    return (
        <div className="bg-background pb-10 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

                {/* Clean Transparent Header: Company Logo, Company Name, Follow button */}
                <div className="flex items-center justify-between gap-4 pb-2.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <CompanyLogo
                            companyName={companyName}
                            companyWebsite={firstJob.companyWebsite}
                            companyLogoUrl={firstJob.companyLogoUrl}
                            applyLink={firstJob.applyLink}
                            isGovernment={firstJob.type === 'GOVERNMENT' || Boolean(firstJob.governmentJobDetails)}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl shrink-0 border border-border/40 bg-background p-0.5 object-contain"
                        />
                        <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight leading-tight truncate">
                            {companyName}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <CompanyFollowButton companySlug={targetSlug} companyName={companyName} />
                    </div>
                </div>

                {/* Job Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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

                <PageTagLinks skills={allSkills} locations={allLocations} />

                <Card className="p-6 md:p-8 space-y-3 shadow-none bg-muted/20 border-border/40 mt-8">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About {companyName}</h2>
                    <div className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose" dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }} />
                </Card>

            </main>
        </div>
    );
}

