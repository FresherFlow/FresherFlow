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
import { fetchCompanyShard, fetchCompaniesMetadata, fetchBootstrapFeed, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';
import { PageTagLinks } from '@/ui/PageTagLinks';
import { getValidDirectoryLinks } from '@/features/opportunities/utils/detailUtils';
import { VALID_LOCATIONS } from '@/features/opportunities/utils/locationUtils';
import { cn } from '@repo/ui/utils/cn';

export const revalidate = false;
export const dynamicParams = false;

function getAtsProvider(url?: string): string {
    if (!url) return 'Custom / In-house';
    const lower = url.toLowerCase();
    if (lower.includes('myworkdayjobs.com') || lower.includes('workday.com')) return 'Workday';
    if (lower.includes('greenhouse.io')) return 'Greenhouse';
    if (lower.includes('lever.co')) return 'Lever';
    if (lower.includes('icims.com')) return 'iCIMS';
    if (lower.includes('successfactors.com')) return 'SuccessFactors';
    if (lower.includes('taleo.net')) return 'Taleo';
    if (lower.includes('smartrecruiters.com')) return 'SmartRecruiters';
    if (lower.includes('bamboohr.com')) return 'BambooHR';
    if (lower.includes('ashbyhq.com')) return 'Ashby';
    if (lower.includes('eightfold.ai')) return 'Eightfold';
    if (lower.includes('phenompro.com') || lower.includes('phenom.com')) return 'Phenom';
    if (lower.includes('careers.google.com')) return 'Google Careers';
    if (lower.includes('amazon.jobs')) return 'Amazon Jobs';
    return 'Custom / In-house';
}

function getTypicalRoles(jobs: any[]): string | null {
    if (!jobs || jobs.length === 0) return null;
    const titles = jobs.map((j: any) => (j.title || '').replace(/[([]\s*.*?\s*[)\]]/g, '').trim()).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const t of titles) counts[t] = (counts[t] || 0) + 1;
    const unique = Object.entries(counts).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 3);
    if (unique.length === 0) return null;
    return unique.join(', ');
}

function getKeyLocations(jobs: any[]): string | null {
    if (!jobs || jobs.length === 0) return null;
    const locs = jobs.flatMap((j: any) => j.locations || []).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const l of locs) counts[l] = (counts[l] || 0) + 1;
    const unique = Object.entries(counts).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 3);
    if (unique.length === 0) return null;
    return unique.join(', ');
}

function getLastHiringActivity(jobs: any[]): string | null {
    if (!jobs || jobs.length === 0) return null;
    // Sort by postedAt descending
    const sorted = [...jobs].sort((a, b) => {
        const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return db - da;
    });
    const latest = sorted[0];
    if (!latest || !latest.postedAt) return null;
    
    const days = Math.floor((Date.now() - new Date(latest.postedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}

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
    const properSlug = slugify(decodeURIComponent(rawSlug));
    const base = SITE_URL.replace(/\/+$/, '');
    const canonicalUrl = `${base}/companies/${properSlug}`;

    const [companyDirectory, shard] = await Promise.all([
        fetchCompaniesMetadata(true),
        fetchCompanyShard(properSlug, undefined, true),
    ]);

    let activeShard = shard;
    let companyName = (shard as any)?.company || shard?.opportunities?.[0]?.company || properSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (companyDirectory && companyDirectory.length > 0) {
        const matched = companyDirectory.find(c => c && (c.slug === properSlug || slugify(c.name || '') === properSlug));
        if (matched?.name) {
            companyName = matched.name;
        }
        if ((!activeShard || !activeShard.opportunities || activeShard.opportunities.length === 0) && matched?.slug && matched.slug !== properSlug) {
            activeShard = await fetchCompanyShard(matched.slug, undefined, true);
        }
    }

    const hasJobs = Boolean(activeShard && activeShard.opportunities && activeShard.opportunities.length > 0);

    const title = `${companyName} Jobs & Internships for Freshers`;
    const description = `Find verified fresher jobs, internships and off-campus opportunities at ${companyName}, with direct official application links.`;
    const ogImageUrl = `${CDN_URL}/og/companies/${properSlug}.png`;

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        robots: hasJobs ? { index: true, follow: true } : { index: false, follow: true },
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
    let matched: any = null;

    if (companyDirectory && companyDirectory.length > 0) {
        matched = companyDirectory.find(c => c && c.slug === properSlug);

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

    const [feedIndex, companyShard] = await Promise.all([
        fetchFeedIndex(false, undefined, true),
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

    if (companyJobs.length === 0) {
        logRouteResult('/companies/[slug]', '404');
        notFound();
    }

    const companyName = (feed as any)?.company || companyJobs[0]?.company ||
        targetSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const firstJob = companyJobs[0];

    const companyStage = firstJob?.companyStage || null;
    const companySize = firstJob?.companySize || null;
    const companyIndustries = Array.from(new Set(
        companyJobs.flatMap((j: any) => j.companyIndustry || [])
    )).filter(Boolean);
    const companyTopics = Array.from(new Set(
        companyJobs.flatMap((j: any) => j.companyTopics || [])
    )).filter(Boolean);

    const allSkills = Array.from(new Set(companyJobs.flatMap(j => (j as any).requiredSkills || []))).filter(Boolean);
    const allLocations = Array.from(new Set(companyJobs.flatMap(j => (j as any).locations || []))).filter(Boolean);
    const stats = { locations: allLocations, skills: allSkills };
    const companyDescriptionHtml = getCompanyDescription(targetSlug, companyName, stats);

    // Validate skills and locations against existing directory paths
    const validDirectoryLinks = feedIndex?.opportunities
        ? getValidDirectoryLinks(feedIndex.opportunities)
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

    // Compute Hiring DNA in-memory from companyJobs
    const totalJobsEver = companyJobs.length;
    const fresherJobsCount = companyJobs.filter(j => ['JOB', 'INTERNSHIP', 'WALKIN'].includes(j.type || '')).length;
    let avgHiringFrequencyDays: number | string = '—';

    if (companyJobs.length > 1) {
        const dates = companyJobs
            .map((j: any) => j.postedAt ? new Date(j.postedAt).getTime() : 0)
            .filter((d: number) => d > 0)
            .sort((a: number, b: number) => a - b);
        if (dates.length > 1) {
            const diffs: number[] = [];
            for (let i = 1; i < dates.length; i++) {
                diffs.push(dates[i] - dates[i - 1]);
            }
            const avgDiffMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const days = Math.round(avgDiffMs / (1000 * 60 * 60 * 24));
            avgHiringFrequencyDays = days > 0 ? days : 1;
        }
    }

    const skillCounts: Record<string, number> = {};
    for (const job of companyJobs) {
        for (const s of ((job as any).requiredSkills || [])) {
            if (s) skillCounts[s] = (skillCounts[s] || 0) + 1;
        }
    }
    let topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(x => x[0]);
    if (topSkills.length === 0) {
        topSkills = allSkills.slice(0, 8);
    }

    let atsProvider = getAtsProvider(firstJob?.applyLink);
    if (atsProvider === 'Custom / In-house') {
        const knownAtsJob = companyJobs.find((j: any) => getAtsProvider(j.applyLink || '') !== 'Custom / In-house');
        if (knownAtsJob) {
            atsProvider = getAtsProvider(knownAtsJob.applyLink || '');
        }
    }

    const topContent = (
        <div className="space-y-8">
            {/* Company Profile Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs relative">
                <CompanyLogo
                    companyName={companyName}
                    companyWebsite={firstJob?.companyWebsite}
                    companyLogoUrl={firstJob?.companyLogoUrl}
                    applyLink={firstJob?.applyLink}
                    isGovernment={firstJob?.type === 'GOVERNMENT' || Boolean(firstJob?.governmentJobDetails)}
                    className="w-16 h-16 rounded-xl shrink-0 border border-border/40 bg-background p-1 object-contain"
                />
                <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">{companyName}</h2>
                        <div className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            companyJobs.length > 0 
                                ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                : "bg-muted text-muted-foreground border-border"
                        )}>
                            {companyJobs.length > 0 ? "Actively Hiring" : "No Open Roles"}
                        </div>
                    </div>
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

            {/* Hiring DNA Section */}
            <section className="border border-border/50 bg-card rounded-xl p-5 space-y-4 shadow-sm">
                <h2 className="font-semibold text-lg text-foreground tracking-tight">Hiring DNA</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold text-primary">{totalJobsEver ?? '—'}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Total jobs tracked</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold text-primary">{fresherJobsCount ?? '—'}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Fresher roles</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold text-primary">{avgHiringFrequencyDays ?? '—'}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Avg days between posts</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold text-foreground">{atsProvider ?? '—'}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">ATS Platform</p>
                    </div>
                </div>

                {topSkills?.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Top skills they hire for:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {topSkills.map(skill => (
                                <span key={skill} className="px-2 py-0.5 border border-border/60 bg-muted/50 rounded-md text-xs font-medium text-foreground">{skill}</span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Hiring Intelligence */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Hiring Intelligence</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">ATS Provider</div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-foreground">{getAtsProvider(firstJob?.applyLink)}</div>
                            {getAtsProvider(firstJob?.applyLink) !== 'Custom / In-house' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                                    Direct Source
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Open Jobs</div>
                        <div className="text-sm font-medium text-foreground">{companyJobs.length} open fresher {companyJobs.length === 1 ? 'role' : 'roles'} right now</div>
                    </div>
                    {getTypicalRoles(companyJobs) && (
                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Typical Roles</div>
                            <div className="text-sm font-medium text-foreground line-clamp-1" title={getTypicalRoles(companyJobs)!}>{getTypicalRoles(companyJobs)}</div>
                        </div>
                    )}
                    {getKeyLocations(companyJobs) && (
                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Key Locations</div>
                            <div className="text-sm font-medium text-foreground line-clamp-1">{getKeyLocations(companyJobs)}</div>
                        </div>
                    )}
                    {getLastHiringActivity(companyJobs) && (
                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Last Hiring Activity</div>
                            <div className="text-sm font-medium text-foreground">Last posted {getLastHiringActivity(companyJobs)}</div>
                        </div>
                    )}
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Career Portal</div>
                        {firstJob?.companyWebsite || firstJob?.applyLink ? (
                            <a href={firstJob?.companyWebsite || firstJob?.applyLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
                                {(() => {
                                    const validUrl = firstJob?.companyWebsite || firstJob?.applyLink;
                                    if (!validUrl) return null;
                                    try {
                                        const urlObj = new URL(validUrl);
                                        if (urlObj.protocol !== 'https:') return 'View Portal';
                                        return 'View Official Careers Page →';
                                    } catch { return 'View Portal'; }
                                })()}
                            </a>
                        ) : (
                            <div className="text-sm font-medium text-foreground">Not listed</div>
                        )}
                    </div>
                    {(companyStage || companySize || companyIndustries.length > 0) && (
                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Company Profile</div>
                            <div className="space-y-1.5 text-sm font-medium text-foreground">
                                {companyStage && <div className="capitalize">Stage: {companyStage}</div>}
                                {companySize && <div>{companySize}</div>}
                                {companyIndustries.length > 0 && (
                                    <div className="capitalize">{companyIndustries.slice(0, 2).join(', ')}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
                topContent={topContent}
            />
        </Suspense>
    );
}

