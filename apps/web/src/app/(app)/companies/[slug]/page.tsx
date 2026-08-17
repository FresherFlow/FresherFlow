import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import CompanyLogo from '@/ui/CompanyLogo';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { getCompanyDescription } from '@/features/companies/utils/companyContent';
import { fetchCompanyShard, fetchCompaniesMetadata, fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';
import { PageTagLinks } from '@/ui/PageTagLinks';
import { getValidDirectoryLinks } from '@/features/opportunities/utils/detailUtils';
import { VALID_LOCATIONS } from '@/features/opportunities/utils/locationUtils';

export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
    try {
        const companyDirectory = await fetchCompaniesMetadata(true);
        if (!companyDirectory) return [];
        const directory = companyDirectory || [];
        
        const slugger = new CompanySlugger(directory);

        // Only pre-build companies with at least 1 active job.
        const feed = await fetchBootstrapFeed(false, undefined, true);
        const activeCompanySlugs = new Set(
            (feed?.opportunities || [])
                .map((o: any) => slugger.getSlug(o))
                .filter(Boolean)
        );

        const seen = new Set<string>();
        const params: { slug: string }[] = [];

        // Pre-build all canonical slugs that have active jobs
        for (const item of directory) {
            if (!item || !item.name) continue;
            const slug = item.slug || slugify(item.name);
            if (slug && !seen.has(slug) && activeCompanySlugs.has(slug)) {
                seen.add(slug);
                params.push({ slug });
            }
            
            // Also pre-build the raw slugified name to support the redirect
            const rawSlug = slugify(item.name);
            if (rawSlug && rawSlug !== slug && !seen.has(rawSlug) && activeCompanySlugs.has(slug)) {
                seen.add(rawSlug);
                params.push({ slug: rawSlug });
            }
        }

        // Catch any companies in the feed that aren't in the JSON
        for (const slug of activeCompanySlugs) {
            if (slug && !seen.has(slug as string)) {
                seen.add(slug as string);
                params.push({ slug: slug as string });
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

    const title = `${companyName} Jobs & Internships for Freshers`;
    const description = `Find verified fresher jobs, internships and off-campus opportunities at ${companyName}, with direct official application links.`;
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

    const [bootstrapFeed, companyShard] = await Promise.all([
        fetchBootstrapFeed(false, undefined, true),
        fetchCompanyShard(targetSlug, undefined, true)
    ]);

    let feed = companyShard;
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

    // Validate skills and locations against existing directory paths
    const validDirectoryLinks = bootstrapFeed?.opportunities
        ? getValidDirectoryLinks(bootstrapFeed.opportunities)
        : { validSkills: new Set<string>(), validLocations: new Set<string>() };

    const validLocationsMapKeys = new Set(Object.keys(VALID_LOCATIONS));
    const mergedValidLocations = new Set([...validDirectoryLinks.validLocations, ...validLocationsMapKeys]);

    const validatedSkills = allSkills.filter(s => {
        const lower = s.trim().toLowerCase();
        return validDirectoryLinks.validSkills.has(lower) || validDirectoryLinks.validSkills.has(slugify(s));
    });

    const validatedLocations = allLocations.filter(l => {
        const lower = l.trim().toLowerCase();
        return mergedValidLocations.has(lower) || mergedValidLocations.has(slugify(l));
    });

    const bottomContent = (
        <div className="space-y-8">
            {/* Company Profile Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs">
                <CompanyLogo
                    companyName={companyName}
                    companyWebsite={firstJob?.companyWebsite}
                    companyLogoUrl={firstJob?.companyLogoUrl}
                    applyLink={firstJob?.applyLink}
                    isGovernment={firstJob?.type === 'GOVERNMENT' || Boolean(firstJob?.governmentJobDetails)}
                    className="w-16 h-16 rounded-xl shrink-0 border border-border/40 bg-background p-1 object-contain"
                />
                <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{companyName}</h2>
                    <p className="text-xs text-muted-foreground font-medium">
                        {companyJobs.length} active fresher {companyJobs.length === 1 ? 'opening' : 'openings'}
                    </p>
                </div>
                <div className="shrink-0 pt-1">
                    <CompanyFollowButton companySlug={targetSlug} companyName={companyName} />
                </div>
            </div>

            {/* Related Topics & Directories */}
            {(validatedSkills.length > 0 || validatedLocations.length > 0) && (
                <PageTagLinks
                    skills={validatedSkills}
                    locations={validatedLocations}
                />
            )}

            {/* About Company */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">About {companyName}</h2>
                <div
                    className="text-sm text-muted-foreground leading-relaxed space-y-4 company-description-prose max-w-4xl"
                    dangerouslySetInnerHTML={{ __html: companyDescriptionHtml }}
                />
            </div>
        </div>
    );

    logRouteResult('/companies/[slug]', '200');

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage
                type={null}
                initialData={{
                    opportunities: companyJobs.map(toOpportunityCardDTO) as any,
                    total: companyJobs.length,
                    cachedAt: (feed as any)?.generatedAt ? new Date((feed as any).generatedAt).getTime() : Date.now(),
                }}
                initialFilters={{ company: [companyName] }}
                customTitle={`${companyName} Jobs`}
                bottomContent={bottomContent}
            />
        </Suspense>
    );
}

