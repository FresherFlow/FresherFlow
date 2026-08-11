import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import JobCard from '@/features/opportunities/components/JobCard';
import { GlobeAltIcon, BriefcaseIcon, CheckBadgeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { PageTagLinks } from '@/ui/PageTagLinks';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { detectAtsProvider } from '@/features/companies/utils/atsDetector';
import { getCompanyDescription, TIER_A_SLUGS } from '@/features/companies/utils/companyContent';
import { fetchCompanyShard, fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';

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

    const allSkills = Array.from(new Set(companyJobs.flatMap(j => j.requiredSkills || []))).filter(Boolean);
    const allLocations = Array.from(new Set(companyJobs.flatMap(j => j.locations || []))).filter(Boolean);

    const stats = {
        activeJobsCount: companyJobs.length,
        locations: allLocations,
        skills: allSkills,
        roles: Array.from(new Set(companyJobs.map(j => j.jobFunction || j.title))).filter(Boolean),
    };

    const firstJob = companyJobs[0];
    const atsProvider = detectAtsProvider([
        firstJob?.companyWebsite,
        ...companyJobs.flatMap(j => [j.applyLink, j.sourceLink])
    ]);

    const companyDescriptionHtml = getCompanyDescription(targetSlug, companyName, stats);

    if (companyJobs.length === 0) {
        logRouteResult('/companies/[slug]', '200');
        return (
            <div className="min-h-screen bg-background pb-20">
                <main className="max-w-7xl mx-auto px-4 md:px-6 py-16 space-y-8">
                    <Card className="text-center space-y-4 py-16 p-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{companyName}</h1>
                        <p className="text-sm text-muted-foreground">No active fresher listings right now. Check back soon.</p>
                        <Link href="/" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">Browse all opportunities →</Link>
                    </Card>
                    <Card className="p-6 md:p-8 space-y-3">
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">About {companyName}</h2>
                        <div
                            className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose"
                            dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }}
                        />
                    </Card>
                </main>
            </div>
        );
    }

    logRouteResult('/companies/[slug]', '200');

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                {/* Single Elegant Company Header */}
                <Card className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <CompanyLogo
                            companyName={companyName}
                            companyWebsite={firstJob.companyWebsite}
                            companyLogoUrl={firstJob.companyLogoUrl}
                            applyLink={firstJob.applyLink}
                            isGovernment={firstJob.type === 'GOVERNMENT' || Boolean(firstJob.governmentJobDetails)}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl shrink-0"
                        />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                                    {companyName}
                                </h1>
                                <Badge variant="default" className="gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                    <CheckBadgeIcon className="w-3.5 h-3.5" /> Verified Hirer
                                </Badge>
                                {atsProvider && !['direct ats', 'official portal', 'unknown', 'direct'].includes(atsProvider.toLowerCase().trim()) && (
                                    <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                        <BuildingOffice2Icon className="w-3.5 h-3.5" /> {atsProvider}
                                    </Badge>
                                )}
                            </div>

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
                                    {companyJobs.length} Active {companyJobs.length === 1 ? 'Opening' : 'Openings'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <CompanyFollowButton companySlug={targetSlug} companyName={companyName} />
                    </div>
                </Card>

                {/* Job Cards — full width grid */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Roles at {companyName}</h2>
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
                </div>

                {/* Tech Stack & Tags */}
                <PageTagLinks skills={allSkills} locations={allLocations} />

                {/* About — clean content card at the bottom */}
                <Card className="p-6 md:p-8 space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About {companyName}</h2>
                    <div
                        className="text-sm text-muted-foreground leading-relaxed space-y-3 company-description-prose"
                        dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }}
                    />
                </Card>

            </main>
        </div>
    );
}
