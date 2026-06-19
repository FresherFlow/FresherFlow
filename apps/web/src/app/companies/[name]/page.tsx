import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import JobCard from '@/features/opportunities/components/JobCard';
import { GlobeAltIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;
// dynamicParams = true: allows newly published jobs to be dynamically generated on their first visit,
// rather than 404ing. This will result in 1 ISR write per new job. If we notice an ISR write burst,
// we may need to revisit this approach or check our cache tags.
export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const { fetchCompaniesMetadata } = await import('@/lib/api/cdnFeed');
        const { slugify } = await import('@fresherflow/utils');
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
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(decodeURIComponent(encodedName));
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const canonicalUrl = `${base}/companies/${slug}`;

    // Derive company name from slug only — no CDN fetch here.
    // The page component fetches the shard once for the actual content rendering.
    // Fetching again in generateMetadata was causing 2x CDN calls per bot request.
    const companyName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const title = `${companyName} Jobs & Internships 2026 | FresherFlow`;
    const description = `Explore verified fresher jobs and internships at ${companyName} on FresherFlow. Direct official apply links, no fake listings.`;

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
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
    };
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name: encodedName } = await params;
    const rawName = decodeURIComponent(encodedName);
    
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(rawName);

    // If the requested URL is not a perfectly clean slug (legacy %20 or uppercase),
    // 301 redirect to the clean slugified version to fix Google Search Console 404s and SEO.
    if (encodedName !== slug) {
        logRouteResult('/companies/[name]', '308');
        permanentRedirect(`/companies/${slug}`);
    }

    const { fetchCompanyShard, fetchCompaniesMetadata } = await import('@/lib/api/cdnFeed');

    // Fast-fail: reject unknown company slugs before the expensive 3.5s shard fetch.
    // companies.json is a small cached list — one quick CDN hit instead of a full shard timeout.
    const companyDirectory = await fetchCompaniesMetadata();
    if (companyDirectory && companyDirectory.length > 0) {
        // companies.json entries are { name, url, logo_url } objects
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

    // Empty state: company exists in sitemap but currently has no active listings.
    // Return a proper page (not 404) so Google keeps it indexed.
    if (companyJobs.length === 0) {
        logRouteResult('/companies/[name]', '200');
        return (
            <div className="min-h-screen bg-background pb-20">
                <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">{companyName}</h1>
                    <p className="text-muted-foreground">No active listings right now. Check back soon.</p>
                    <Link href="/" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">Browse all opportunities →</Link>
                </main>
            </div>
        );
    }

    const firstJob = companyJobs[0];
    const profile = {
        name: companyName,
        logo: firstJob.companyLogoUrl,
        website: firstJob.companyWebsite,
        stats: { activeJobs: companyJobs.length }
    };

    logRouteResult('/companies/[name]', '200');

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/60">
                    <div className="flex items-start gap-5">
                        <CompanyLogo
                            companyName={profile.name}
                            companyWebsite={profile.website}
                            companyLogoUrl={profile.logo}
                            applyLink={firstJob.applyLink}
                            isGovernment={firstJob.type === 'GOVERNMENT' || Boolean(firstJob.governmentJobDetails)}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem]"
                        />
                        <div className="space-y-2 pt-1">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                {profile.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                                {profile.website && (
                                    <a
                                        href={profile.website as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                    >
                                        <GlobeAltIcon className="w-4 h-4" />
                                        Official Website
                                    </a>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <BriefcaseIcon className="w-4 h-4" />
                                    {profile.stats.activeJobs} Active Listings
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Open Opportunities</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {companyJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={{
                                    ...job,
                                    company: companyName,
                                    normalizedRole: job.title,
                                    salary: (job.salaryMin !== undefined && job.salaryMax !== undefined) ? { min: job.salaryMin, max: job.salaryMax } : undefined,
                                }}
                                jobId={job.id}
                                isApplied={(job.actions || []).some((a: any) => a.actionType === 'APPLIED')}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
