import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { isGovernmentOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { fetchCompanyShard, fetchCompaniesMetadata, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import { resolveCompanySlugAlias } from '@/features/companies/utils/companySlugAliases';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';
import CompanyRoleCard from './_components/CompanyRoleCard';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import { Card, CardContent } from '@/ui/Card';
import { BrandButton } from '@/ui/BrandButton';
import { CompanyDiscussionDock } from '@/features/jobs/components/discussion/JobDiscussionDock';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';
import {
    BarChart3,
    Briefcase,
    Building2,
    Clock,
    ExternalLink,
    Layers,
    MapPin,
    type LucideIcon,
} from 'lucide-react';
// NOTE: fetchCompaniesMetadata / fetchCompanyShard / fetchFeedIndex are already
// wrapped in React cache() inside lib/api/cdnFeed.ts, so generateMetadata and
// the page component share one set of CDN round-trips per request.

// ISR: company pages serve cached HTML and revalidate hourly. A cold CDN
// fetch per slug caused ~2s TTFB on /companies/microsoft (audit); cached
// serves fix it without any per-request work.
export const revalidate = 3600;
// dynamicParams = true: companies published after the last build (or slugs the
// build-time feed snapshot missed) must render on demand instead of 404ing.
// The page body itself is inventory-gated and calls notFound() when a company
// has no live jobs, so this does not create thin or stale pages.
export const dynamicParams = true;

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

/** "3d ago" / "1mo ago" stamp for a role row. Null when there is no date. */
function getRelativeDate(value: string | number | Date): string | null {
    const then = new Date(value).getTime();
    if (!Number.isFinite(then)) return null;
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return months <= 1 ? '1mo ago' : `${months}mo ago`;
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
        const feed = await fetchFeedIndex(false, undefined, true);
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

        // Bound the pre-build: busiest companies first, top 150 only. The
        // long tail renders on demand through ISR instead of slowing every
        // build. Raw-slug duplicates carry no job count, so they sink and
        // are sliced off first.
        const liveCounts = new Map<string, number>();
        for (const o of feed?.opportunities || []) {
            const s = slugger.getSlug(o);
            if (s) liveCounts.set(s, (liveCounts.get(s) || 0) + 1);
        }
        params.sort((a, b) => (liveCounts.get(b.slug) || 0) - (liveCounts.get(a.slug) || 0));
        return params.slice(0, 150);
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
    // Metadata must declare the canonical URL we actually serve â€” resolve
    // aliases here too, so an old slug's canonical points at the live page
    // instead of endorsing itself.
    const canonicalSlug = resolveCompanySlugAlias(properSlug);
    const canonicalUrl = `${base}/companies/${canonicalSlug}`;

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

    // SEO: keep the full <title> within 50-60 chars once the root layout
    // template ("%s | FresherFlow", 13 chars) is applied â€” base stays â‰¤47.
    // Long company names fall back to the shorter form, then truncate.
    let title = `${companyName} Jobs & Openings for Freshers`;
    if (title.length > 47) title = `${companyName} Fresher Jobs 2026`;
    if (title.length > 47) title = `${companyName.slice(0, 33).trimEnd()} Fresher Jobs`;
    const description = `Find current fresher jobs, internships and off-campus openings at ${companyName}, with direct official application links.`;
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

    // Explicit alias redirects (company renames) â€” checked before anything
    // else so a renamed company's old URL never 404s, even when the CDN
    // directory fetch fails.
    const aliasTarget = resolveCompanySlugAlias(properSlug);
    if (aliasTarget !== properSlug) {
        logRouteResult('/companies/[slug]', '308');
        permanentRedirect(`/companies/${aliasTarget}`);
    }

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

    // Fallback: company shards are not uploaded to R2 yet (producer disabled),
    // so derive this company's jobs from the lightweight feed index using the
    // same slugger logic as generateStaticParams.
    if (companyJobs.length === 0 && feedIndex?.opportunities?.length) {
        const slugger = new CompanySlugger(companyDirectory || []);
        const derived = feedIndex.opportunities.filter((o: any) => slugger.getSlug(o) === targetSlug);
        if (derived.length > 0) {
            companyJobs = derived;
            feed = { opportunities: derived, count: derived.length, generatedAt: (feedIndex as any).generatedAt };
        }
    }

    if (companyJobs.length === 0) {
        // Audit fix (33x /companies/* 404s): a slug the directory knows but
        // with zero live jobs is gone inventory, not a dead end â€” 301 to the
        // closest live page (/companies). Unknown slugs 404 and stay out of
        // the sitemap and internal links (both are live-companies-only).
        if (matched) {
            logRouteResult('/companies/[slug]', '301');
            permanentRedirect('/companies');
        }
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

    const atsProvider = getAtsProvider(firstJob?.applyLink);
    const lastPosted = getLastHiringActivity(companyJobs);
    const typicalRoles = getTypicalRoles(companyJobs);
    const keyLocations = getKeyLocations(companyJobs);
    const portalUrl = firstJob?.companyWebsite || firstJob?.applyLink || null;

    // Skill frequency across this company's live roles.
    const skillCounts: Record<string, number> = {};
    for (const job of companyJobs) {
        for (const s of ((job as any).requiredSkills || [])) {
            if (s) skillCounts[s] = (skillCounts[s] || 0) + 1;
        }
    }
    const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(x => x[0]);

    // The roles this company has open, newest first. Built from the same array
    // as everything else above, so nothing on the page can disagree.
    const openRoles = [...companyJobs]
        .filter((j: any) => !isGovernmentOpportunity(j))
        .sort((a: any, b: any) => {
            const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
            return db - da;
        });

    // Government postings route to /govt/{slug}, not /jobs/{slug}. They stay in
    // the header count (it is the true total) but are kept out of this list.
    const listableRoles = openRoles.filter((j: any) => j.slug || j.id);
    const hiddenRoleCount = openRoles.length - listableRoles.length;
    // Roles that exist on the feed but have no /jobs/ page to link to. Counted
    // separately from government roles so the "not listed" note is accurate.
    const governmentRoleCount = companyJobs.length - openRoles.length;
    // The list heading counts what the list actually renders, so the number a
    // reader sees always equals the number of rows below it.
    const listedRoleCount = listableRoles.length;

    const ROLE_TYPE_LABEL: Record<string, string> = {
        FULL_TIME: 'Full time',
        PART_TIME: 'Part time',
        INTERNSHIP: 'Internship',
        CONTRACT: 'Contract',
    };

    const roleMeta = (job: any) => {
        const locs: string[] = Array.isArray(job.locations) ? job.locations.filter(Boolean) : [];
        const type = Array.isArray(job.employmentTypes) && job.employmentTypes.length > 0
            ? ROLE_TYPE_LABEL[job.employmentTypes[0]] ?? String(job.employmentTypes[0]).toLowerCase()
            : null;
        return {
            location: locs.length > 0 ? locs.slice(0, 2).join(', ') : null,
            type,
            posted: job.postedAt ? getRelativeDate(job.postedAt) : null,
            // Outbound link for the row's Apply button. Scraped feed values, so
            // it goes through the same scheme allowlist as the careers link.
            applyHref: toSafeOutboundUrl(job.applyLink || job.companyWebsite),
        };
    };

    // Company details rows. Each carries an icon so the aside reads as a
    // labelled list rather than an unlabelled value dump. The filter drops any
    // field the feed has no value for, so no row shows a placeholder, and every
    // fact here is rendered exactly once on the page.
    const detailRows: Array<{ icon: LucideIcon; label: string; value: string }> = [
        { icon: Briefcase, label: 'Typical roles', value: typicalRoles ?? '' },
        { icon: MapPin, label: 'Key locations', value: keyLocations ?? '' },
        { icon: Clock, label: 'Last posted', value: lastPosted ?? '' },
        { icon: Layers, label: 'Hiring source', value: atsProvider },
        { icon: Building2, label: 'Company stage', value: companyStage ? companyStage.toLowerCase() : '' },
    ].filter((row) => row.value && row.value !== 'Custom / In-house');

    // Header subtitle. Industry and team size are the only company-level
    // attributes the feed actually carries, so the hero states those rather
    // than inventing a description or headquarters line.
    const headerMeta = [companyIndustries[0], companySize].filter(Boolean).join('  Â·  ');

    logRouteResult('/companies/[slug]', '200');

    const safePortalUrl = toSafeOutboundUrl(portalUrl);

    return (
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
            {/* Identity. No card, no gradient, no shadow: SiteHeader already
                renders the breadcrumb trail above this, and the logo renders
                its own surface, so a wrapper box would only stack a third
                border around it. */}



            {/* Company identity on the left, the two actions centred from `sm` up.
                The empty `flex-1` track on the right is what centres them: without
                a spacer of equal width the action group can only ever sit flush
                right. Below `sm` that spacer is hidden, so on a phone the group
                keeps its place at the end of the single row, where there is no
                width to spare for a centred column. */}
            <header className="flex items-center gap-3 sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CompanyLogo
                        companyName={companyName}
                        companyWebsite={firstJob?.companyWebsite}
                        companyLogoUrl={firstJob?.companyLogoUrl}
                        applyLink={firstJob?.applyLink}
                        isGovernment={Boolean(firstJob && isGovernmentOpportunity(firstJob))}
                        className="!h-14 !w-14 md:!h-20 md:!w-20 shrink-0"
                        priority
                    />

                    <div className="min-w-0">
                        <h1 className="truncate text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            {companyName}
                        </h1>
                        {headerMeta && (
                            <p className="mt-1 truncate text-sm text-muted-foreground">{headerMeta}</p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {safePortalUrl && (
                        <BrandButton asChild variant="outline" size="sm">
                            <a href={safePortalUrl} target="_blank" rel="noopener noreferrer">
                                Careers page
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </BrandButton>
                    )}
                    <CompanyFollowButton companySlug={targetSlug} />
                </div>

                {/* Balances the centred action group. Decorative only. */}
                <div className="hidden flex-1 sm:block" aria-hidden="true" />
            </header>



            {/* Two columns: the roles list is why the page exists, so it takes
                the wider track; the aside carries the small facts. */}
            <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                        {listedRoleCount} open {listedRoleCount === 1 ? 'role' : 'roles'}
                    </h2>
                    {/* No wrapper card and no dividers. The saved-jobs page stacks
                        its rows as individual bordered cards with a gap between
                        them, and this list is literally that same component, so
                        framing it again in a box just put a second border around
                        every card. */}
                    <div className="mt-3 grid gap-3">
                        {listableRoles.map((job: any) => {
                            const meta = roleMeta(job);
                            return (
                                <CompanyRoleCard
                                    key={job.id || job.slug}
                                    opp={job}
                                    typeLabel={meta.type ?? undefined}
                                    applyHref={meta.applyHref}
                                />
                            );
                        })}
                    </div>
                    {(hiddenRoleCount > 0 || governmentRoleCount > 0) && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            {hiddenRoleCount > 0 && (
                                <>{hiddenRoleCount} more {hiddenRoleCount === 1 ? 'role is' : 'roles are'} not listed here.</>
                            )}
                            {hiddenRoleCount > 0 && governmentRoleCount > 0 && ' '}
                            {governmentRoleCount > 0 && (
                                <>{governmentRoleCount} government {governmentRoleCount === 1 ? 'role is' : 'roles are'} listed separately.</>
                            )}
                        </p>
                    )}
                </div>

                <aside className="space-y-5">
                    {detailRows.length > 0 && (
                        <Card>
                            <CardContent className="p-5">
                                <h2 className="text-lg font-bold tracking-tight text-foreground">
                                    Company details
                                </h2>
                                <ul className="mt-4 space-y-4">
                                    {detailRows.map((row) => {
                                        const Icon = row.icon;
                                        return (
                                            <li key={row.label} className="flex items-start gap-3">
                                                <Icon
                                                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                                                    aria-hidden="true"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">{row.label}</p>
                                                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                                                        {row.value}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {topSkills.length > 0 && (
                                    <>
                                        <div className="my-5 border-t border-border/60" />
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <BarChart3 className="h-4 w-4 text-foreground" aria-hidden="true" />
                                            Skills in demand
                                        </h3>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {topSkills.map((skill: string) => (
                                                <SkillPill key={skill} skill={skill} size="sm" />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </aside>

            {/* Company thread: lives on the company, not a listing, so the
                hiring-process talk survives the job it started on. Fixed
                position, so it never affects this grid's layout. */}
            <CompanyDiscussionDock companySlug={targetSlug} companyName={companyName} />
            </div>
        </div>
    );
}
