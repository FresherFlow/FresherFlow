import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { isGovernmentOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { fetchCompanyShard, fetchCompaniesMetadata, fetchFeedIndex, fetchCompanySlugHistory, fetchExpiredFeed } from '@/lib/api/feedServer';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import { resolveCompanySlugAlias } from '@/features/companies/utils/companySlugAliases';
import { resolveCompanyCareersUrl } from '@/features/companies/utils/companyCareersUrl';
import CompanyFollowButton from '@/features/companies/components/CompanyFollowButton';
import CompanyShareTiles from '@/features/companies/components/CompanyShareTiles';
import CompanyRoleCard from './_components/CompanyRoleCard';
import CompanyArchiveView from './_components/CompanyArchiveView';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { CompanyDiscussionDock } from '@/features/jobs/components/discussion/JobDiscussionDock';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';
import {
    Building2,
    Clock,
    ExternalLink,
    Users,
    type LucideIcon,
} from 'lucide-react';

// NOTE: fetchCompaniesMetadata / fetchCompanyShard / fetchFeedIndex are already
// wrapped in React cache() inside lib/api/feedServer.ts, so generateMetadata and
// the page component share one set of CDN round-trips per request.

// No timer, by design — see `lib/api/feedCache.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;
// dynamicParams = true: companies published after the last build (or slugs the
// build-time feed snapshot missed) must render on demand instead of 404ing.
// The page body itself is inventory-gated and calls notFound() when a company
// has no live jobs, so this does not create thin or stale pages.
export const dynamicParams = true;

/**
 * The most common real titles, each kept with a linkable job. The page renders
 * these as individual chips, never as one comma-joined sentence.
 */
function getTypicalRoles(jobs: any[]): Array<{ title: string; job: any }> {
    if (!jobs || jobs.length === 0) return [];
    const groups = new Map<string, { count: number; job: any }>();
    for (const job of jobs) {
        const title = (job?.title || '').replace(/[([]\s*.*?\s*[)\]]/g, '').trim();
        if (!title) continue;
        const existing = groups.get(title);
        if (existing) existing.count += 1;
        else groups.set(title, { count: 1, job });
    }
    return [...groups.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([title, { job }]) => ({ title, job }));
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
        const companyDirectory = await fetchCompaniesMetadata();
        if (!companyDirectory) return [];
        const directory = companyDirectory || [];
        
        const slugger = new CompanySlugger(directory);

        // Only pre-build companies with at least 1 active job.
        const feed = await fetchFeedIndex();
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

    const [shard, slugHistory] = await Promise.all([
        fetchCompanyShard(properSlug),
        fetchCompanySlugHistory(),
    ]);

    // Metadata must declare the canonical URL we actually serve — resolve
    // aliases against the published history and the static seed so an old
    // slug's canonical points at the live page instead of endorsing itself.
    const canonicalSlug = resolveCompanySlugAlias(properSlug, slugHistory.aliases);
    const canonicalUrl = `${base}/companies/${canonicalSlug}`;

    let companyName = (shard as any)?.company || shard?.opportunities?.[0]?.company || properSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Indexability is about whether this company exists, not whether it is
    // hiring right now. A company with zero live jobs still renders a real
    // archive page at this URL, so noindexing it would trade a thin page for a
    // dead one. Only a slug that was never published is noindex.
    // A company that has ever had a live job keeps an indexable archive page.
    // Without this, a slug in the published history would be noindexed the
    // moment its last role expires, which drops a URL Google already crawls.
    const isKnownCompany = Boolean(
        (shard as any)?.company ||
        (shard?.opportunities?.length ?? 0) > 0 ||
        slugHistory.everLive.has(properSlug) ||
        slugHistory.everLive.has(canonicalSlug)
    );

    // SEO: keep the full <title> within 60 chars once the root layout
    // template is applied. The separator and brand add 14 chars, so the
    // base must stay at 46 or less.
    // Long company names fall back to the shorter form, then truncate.
    let title = `${companyName} Careers & Fresher Jobs`;
    if (title.length > 46) title = `${companyName} Careers 2026`;
    if (title.length > 46) title = `${companyName.slice(0, 33).trimEnd()} Careers`;
    const description = `Explore ${companyName} careers for freshers: current jobs, internships and off-campus openings with direct official application links.`;
    const ogImageUrl = `${CDN_URL}/og/companies/${properSlug}.png`;

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        robots: isKnownCompany ? { index: true, follow: true } : { index: false, follow: true },
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

    const [companyDirectory, slugHistory] = await Promise.all([
        fetchCompaniesMetadata(),
        fetchCompanySlugHistory(),
    ]);
    let targetSlug = properSlug;
    let shouldRedirectTo: string | null = null;
    let matched: any = null;

    // Explicit alias redirects (company renames) — checked before anything
    // else so a renamed company's old URL never 404s, even when the CDN
    // directory fetch fails. `slugHistory.aliases` is the API-maintained map;
    // the static seed in companySlugAliases.ts is the fallback beneath it.
    const aliasTarget = resolveCompanySlugAlias(properSlug, slugHistory.aliases);
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
                // The directory only carries employers with a live role, but the
                // CDN history records every company that has ever had one. Keep
                // those URLs alive as an archive instead of returning 404.
                if (
                    slugHistory.everLive.has(properSlug) ||
                    slugHistory.everLive.has(aliasTarget)
                ) {
                    const aliasName = Object.entries(slugHistory.aliases)
                        .find(([, to]) => to === properSlug)?.[0]
                        ?.replace(/-/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                    const archiveName = aliasName ||
                        properSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    logRouteResult('/companies/[slug]', '200');
                    return <CompanyArchiveView companyName={archiveName} slug={properSlug} archivedRoles={[]} />;
                }
                logRouteResult('/companies/[slug]', '404');
                // Never cache a miss: with dynamicParams = true, any slug a
                // crawler invents renders here. Without this call the 404 is
                // written to the ISR cache under that invented URL.
                const { unstable_noStore: noStoreMiss } = await import('next/cache');
                noStoreMiss();
                notFound();
            }
        }
    }

    if (shouldRedirectTo) {
        permanentRedirect(`/companies/${shouldRedirectTo}`);
    }

    let feed = await fetchCompanyShard(targetSlug);
    let companyJobs = feed?.opportunities || [];

    if (companyJobs.length === 0 && targetSlug !== properSlug) {
        feed = await fetchCompanyShard(properSlug);
        companyJobs = feed?.opportunities || [];
        if (companyJobs.length > 0) {
            targetSlug = properSlug;
        }
    }

    // Company shards are the normal path. Only load the feed index when a shard
    // is missing, then derive this company's jobs using the same slugger logic
    // as generateStaticParams.
    if (companyJobs.length === 0) {
        const feedIndex = await fetchFeedIndex();
        if (feedIndex?.opportunities?.length) {
            const slugger = new CompanySlugger(companyDirectory || []);
            const derived = feedIndex.opportunities.filter((o: any) => slugger.getSlug(o) === targetSlug);
            if (derived.length > 0) {
                companyJobs = derived;
                feed = { opportunities: derived, count: derived.length, generatedAt: (feedIndex as any).generatedAt };
            }
        }
    }

    if (companyJobs.length === 0) {
        // A company that has ever been published keeps its page. Google has
        // already crawled this URL and earned its rankings; returning 301 to
        // /companies was how those pages quietly disappeared from the index.
        // Render the archive instead so the URL keeps its 200, canonical and
        // internal links, and the company only 404s if it was never published.
        const everPublished = Boolean(matched) || slugHistory.everLive.has(properSlug) || slugHistory.everLive.has(targetSlug);

        if (!everPublished) {
            logRouteResult('/companies/[slug]', '404');
            const { unstable_noStore: noStoreMiss } = await import('next/cache');
            noStoreMiss();
            notFound();
        }

        // Archived roles: the most recent ones this company posted, so the page
        // still has real content and the slug keeps matching search intent.
        const [expiredFeed, dirForArchive] = await Promise.all([
            fetchExpiredFeed(),
            companyDirectory,
        ]);
        const archiveSlugger = new CompanySlugger(dirForArchive || []);
        const archivedRoles = ((expiredFeed?.opportunities ?? []) as any[])
            .filter((o: any) => archiveSlugger.getSlug(o) === targetSlug)
            .sort((a: any, b: any) => {
                const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                return db - da;
            })
            .slice(0, 10);

        const archiveName = matched?.name
            || (dirForArchive || []).find(c => c && (c.slug === targetSlug || slugify(c.name || '') === targetSlug))?.name
            || targetSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        logRouteResult('/companies/[slug]', '200');
        return <CompanyArchiveView companyName={archiveName} slug={targetSlug} archivedRoles={archivedRoles} />;
    }

    const companyName = (feed as any)?.company || companyJobs[0]?.company ||
        targetSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const firstJob = companyJobs[0];

    const companyStage = firstJob?.companyStage || null;
    const companySize = firstJob?.companySize || null;
    const companyIndustries = Array.from(new Set(
        companyJobs.flatMap((j: any) => j.companyIndustry || [])
    )).filter(Boolean);

    const lastPosted = getLastHiringActivity(companyJobs);
    const typicalRoles = getTypicalRoles(companyJobs.filter((j: any) => j.slug || j.id));
    // The Careers button must reach the company's board, not one listing.
    // A scraped companyWebsite is often just that job's ATS apply link, so
    // resolve it to a real company domain or an ATS board root first.
    const portalUrl = resolveCompanyCareersUrl(firstJob?.companyWebsite, firstJob?.applyLink);

    // Skill frequency across this company's live roles.
    const skillCounts: Record<string, number> = {};
    for (const job of companyJobs) {
        for (const s of ((job as any).requiredSkills || [])) {
            if (s) skillCounts[s] = (skillCounts[s] || 0) + 1;
        }
    }
    const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
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

    // Header subtitle: only industries the feed actually carries. No invented
    // description or headquarters line when the feed has nothing to say.
    const headerMeta = companyIndustries.slice(0, 2).join(', ');

    // Plain server-rendered overview. Every fact below comes from the same
    // feed as the cards on this page, so the copy cannot disagree with them.
    const introLocations = Array.from(new Set(
        companyJobs.flatMap((j: any) => Array.isArray(j.locations) ? j.locations.filter(Boolean) : [])
    )).slice(0, 3);
    const introBatches = Array.from(new Set(
        companyJobs.flatMap((j: any) => Array.isArray(j.allowedPassoutYears) ? j.allowedPassoutYears : [])
    )).sort((a, b) => Number(b) - Number(a)).slice(0, 3);
    const introRoleNames = typicalRoles.slice(0, 3).map(({ title }) => title).join(', ');
    const introSkillNames = topSkills.slice(0, 4).join(', ');

    const companyOverview = [
        `FresherFlow tracks ${listedRoleCount} live ${listedRoleCount === 1 ? 'opening' : 'openings'} at ${companyName} for students and recent graduates.`,
        introRoleNames ? `Recent roles include ${introRoleNames}.` : '',
        introLocations.length ? `Openings are based in ${introLocations.join(', ')}.` : '',
        introBatches.length ? `Eligible graduation batches include ${introBatches.join(', ')}.` : '',
        headerMeta ? `The feed lists ${companyName} under ${headerMeta}.` : '',
    ].filter(Boolean).join(' ');

    const companyApplyCopy = [
        introSkillNames
            ? `Across these listings, ${introSkillNames} come up most often.`
            : 'Each listing carries its own eligibility and skill requirements.',
        'Check the posting date, location and eligibility on each role before you apply.',
        `Every role links straight to ${companyName}'s official application page, so you can confirm the current opening and apply there.`,
        'This profile updates as new roles are published and closed roles are removed.',
    ].join(' ');

    logRouteResult('/companies/[slug]', '200');

    const safePortalUrl = toSafeOutboundUrl(portalUrl);

    // Only a few hard facts, in one tight line. "Open roles" is already the
    // heading of the list below, and a joined location string is noise here.
    // Nothing renders without a real value — no placeholders, no guesses.
    const specFacts: { label: string; value: string; icon: LucideIcon }[] = [
        ...(lastPosted ? [{ label: 'Last posted', value: lastPosted, icon: Clock }] : []),
        ...(companySize ? [{ label: 'Team size', value: companySize, icon: Users }] : []),
        ...(companyStage ? [{ label: 'Company stage', value: companyStage.toLowerCase(), icon: Building2 }] : []),
    ].filter((fact) => Boolean(fact.value.trim()));

    return (
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
            {/* Masthead. One structural stroke, one bold moment (the name), and
                everything else quiet and aligned — the same visual language as
                the job detail page. In dark the card drops its border and is
                separated from the page by surface lightness alone. */}
            <article className="relative overflow-hidden rounded-2xl border border-border-strong bg-card dark:border-transparent">
                <div className="h-1 w-full bg-primary dark:bg-border-strong" />

                <div className="p-4 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            <span className="text-meta font-medium text-muted-foreground">Company profile</span>
                        </div>
                        <CompanyShareTiles companyName={companyName} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <CompanyLogo
                                companyName={companyName}
                                companyWebsite={firstJob?.companyWebsite}
                                companyLogoUrl={firstJob?.companyLogoUrl}
                                applyLink={firstJob?.applyLink}
                                isGovernment={Boolean(firstJob && isGovernmentOpportunity(firstJob))}
                                className="size-12 shrink-0 rounded-xl md:size-14"
                                priority
                            />
                            <h1 className="min-w-0 max-w-3xl text-2xl font-bold leading-tight tracking-tight text-foreground text-balance md:text-3xl">
                                {companyName}
                            </h1>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {safePortalUrl && (
                                <a
                                    href={safePortalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-meta font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    Careers page
                                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                                </a>
                            )}
                            <CompanyFollowButton companySlug={targetSlug} />
                        </div>
                    </div>

                    {headerMeta && (
                        <p className="mt-2 text-pretty text-sm text-muted-foreground">{headerMeta}</p>
                    )}

                    {/* Compact fact line. Only real facts appear, and they share
                        one row instead of a grid of padded cells that pushed the
                        roles list far below the fold. */}
                    {specFacts.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted-foreground">
                            {specFacts.map((fact) => {
                                const Icon = fact.icon;
                                return (
                                    <span key={fact.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                        <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                                        {fact.label}
                                        <span className="font-semibold text-foreground tabular-nums">{fact.value}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {(typicalRoles.length > 0 || topSkills.length > 0) && (
                        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2 md:gap-8">
                            {typicalRoles.length > 0 && (
                                <section aria-labelledby="typical-roles-heading">
                                    <h2 id="typical-roles-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                                        Typical roles
                                    </h2>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {typicalRoles.map(({ title, job }) => (
                                            <Link
                                                key={title}
                                                href={getOpportunityPathFromItem(job)}
                                                className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50 [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-transparent dark:bg-surface-sunken"
                                            >
                                                {title}
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {topSkills.length > 0 && (
                                <section aria-labelledby="company-skills-heading">
                                    <h2 id="company-skills-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                                        Skills in demand
                                    </h2>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {topSkills.map((skill: string) => (
                                            <SkillPill
                                                key={skill}
                                                skill={skill}
                                                size="sm"
                                                className="text-meta! font-medium text-foreground dark:border-transparent dark:bg-surface-sunken"
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    <section aria-labelledby="company-overview-heading" className="mt-4 border-t border-border pt-4">
                        <h2 id="company-overview-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            Hiring overview
                        </h2>
                        <div className="mt-2 space-y-2 text-pretty text-sm text-muted-foreground">
                            <p>{companyOverview}</p>
                            <p>{companyApplyCopy}</p>
                        </div>
                    </section>
                </div>
            </article>



            {/* The roles list is why the page exists, so it takes the wider
                track. Heading and rows share one panel, the same way the detail
                page groups Related opportunities. Each row keeps the detail
                page's card markup. */}
            <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 dark:border-transparent lg:col-span-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        {listedRoleCount} open {listedRoleCount === 1 ? 'role' : 'roles'}
                    </h2>
                    <div className="mt-3 grid gap-2">
                        {listableRoles.map((job: any) => {
                            const meta = roleMeta(job);
                            return (
                                <CompanyRoleCard
                                    key={job.id || job.slug}
                                    opp={job}
                                    applyHref={meta.applyHref}
                                />
                            );
                        })}
                    </div>
                    {(hiddenRoleCount > 0 || governmentRoleCount > 0) && (
                        <p className="mt-3 text-pretty text-meta text-muted-foreground">
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
                    <div className="rounded-2xl border border-border-strong bg-card p-5 dark:border-transparent">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            Browse more
                        </h2>
                        <p className="mt-3 text-pretty text-sm text-muted-foreground">
                            Explore fresher jobs, internships and walk-in drives across India.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {[
                                { label: 'All jobs', href: '/jobs' },
                                { label: 'Internships', href: '/jobs/internships' },
                                { label: 'Walk-in drives', href: '/drives/walk-in' },
                            ].map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="inline-flex rounded-md border border-border-strong bg-card px-3 py-2 text-meta font-medium text-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-transparent dark:bg-surface-sunken"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Company thread: lives on the company, not a listing, so the
                hiring-process talk survives the job it started on. Fixed
                position, so it never affects the layout above. */}
            <CompanyDiscussionDock companySlug={targetSlug} companyName={companyName} />
        </div>
    );
}
