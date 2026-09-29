import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from '@/features/jobs/components/detail/OpportunityDetailClient';
import { OpportunityDetailSkeleton, FeedPageSkeleton } from '@/features/jobs/components/OpportunitySkeletons';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import {
    fetchOpportunityForPage,
    fetchOpportunityForMetadata,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    generateOpportunityBreadcrumbsJsonLd,
    getExpiryState,
    getTypeHubPath,
    ExtendedOpportunity
} from '@/features/jobs/domain/opportunitySeo';
import { fetchGovernmentFeed, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { getRelatedOpportunities, getValidDirectoryLinks } from '@/features/jobs/utils/detailUtils';
import { getFeedBadgeLabel, isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import {
    buildTaxonomyRegistry,
    resolveTaxonomySlug,
    matchTaxonomy,
    boardCanonicalSlug,
    assertRegistryJobSlugCollision,
    TaxonomyRegistry,
} from '@/features/jobs/domain/taxonomy';
import { TopicBoardPage } from '@/features/jobs/components/TopicBoardPage';



/** Returns true for errors thrown by notFound() or redirect()/permanentRedirect() in Next.js 15+/16. */
function isNextNavigationError(err: unknown): boolean {
    const digest = (err as { digest?: string })?.digest ?? '';
    return digest === 'NEXT_HTTP_ERROR_FALLBACK;404' || digest.startsWith('NEXT_REDIRECT');
}

const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined', 'login', 'jobs', 'saved', 'tracker']);

function isInvalidSlug(slug: string): boolean {
    const lower = slug.toLowerCase();
    return (
        CRAWLER_PATHS.has(lower) ||
        lower.startsWith('api') ||
        lower.includes('/') ||
        lower.includes('.') ||
        lower.includes('\\')
    );
}

// ── Taxonomy board resolution (doc 22 §22.3) ─────────────────────────────
// ONE /jobs namespace: /jobs/[slug] parses taxonomy boards AND job detail.
// Resolver order: static segments (internships|remote|walkins — their own
// route files) → registry hit → job detail → 404.

function getJobSlugs(
    feed: { opportunities?: Array<{ slug?: string | null; id?: string | null }> } | null,
): Set<string> {
    const slugs = new Set<string>();
    for (const opp of feed?.opportunities || []) {
        const slug = opp.slug || opp.id;
        if (slug) slugs.add(slug);
    }
    return slugs;
}

/** One feed pass builds the board registry; registry slugs ∩ job slugs = ∅ asserted at build. */
async function loadTaxonomyRegistry(): Promise<TaxonomyRegistry | null> {
    try {
        const feed = await fetchFeedIndex(false, undefined, true);
        const registry = buildTaxonomyRegistry(feed?.opportunities || []);
        assertRegistryJobSlugCollision(registry, getJobSlugs(feed));
        return registry;
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[taxonomy] registry build failed:', err instanceof Error ? err.message : err);
        }
        return null;
    }
}

function boardTitle(resolved: NonNullable<ReturnType<typeof resolveTaxonomySlug>>): string {
    switch (resolved.kind) {
        case 'role': return `${resolved.label} Jobs for Freshers`;
        case 'city': return `Jobs in ${resolved.label} for Freshers`;
        case 'skill': return `${resolved.label} Jobs for Freshers`;
        case 'year': return `Jobs for ${resolved.year} Passouts`;
    }
}

function boardDescription(resolved: NonNullable<ReturnType<typeof resolveTaxonomySlug>>): string {
    switch (resolved.kind) {
        case 'role':
            return `Find verified fresher ${resolved.label} jobs and internships, curated from the live feed with direct official apply links.`;
        case 'city':
            return `Browse verified fresher jobs, internships and walk-in drives in ${resolved.label}, with direct official application links.`;
        case 'skill':
            return `Find verified fresher jobs and internships requiring ${resolved.label}, including entry-level opportunities with direct official apply links.`;
        case 'year':
            return `Find verified jobs, internships and walk-in drives hiring ${resolved.year} batch passouts. Direct official application links.`;
    }
}

type Props = {
    params: Promise<{ slug: string }>;
};

// On-Demand Revalidation is used for this route via /api/revalidate
export const revalidate = false;

// dynamicParams = true: allows newly published jobs to be dynamically generated on their first visit,
// rather than 404ing. This will result in 1 ISR write per new job. If we notice an ISR write burst,
// we may need to revisit this approach or check our cache tags.
export const dynamicParams = true;


export async function generateStaticParams() {
    try {
        const [feed, govtFeed] = await Promise.all([
            fetchFeedIndex(false, undefined, true),
            fetchGovernmentFeed(false, undefined, true),
        ]);

        const slugs = new Set<string>();

        feed?.opportunities?.forEach((opp) => {
            const slug = opp.slug || opp.id;
            if (slug) slugs.add(slug);
        });

        govtFeed?.opportunities?.forEach((opp) => {
            const slug = opp.slug || opp.id;
            if (slug) slugs.add(slug);
        });

        return Array.from(slugs).map((slug) => ({ slug }));
    } catch {
        return [];
    }
}

// Generate dynamic SEO metadata.
// Board-first: a `-jobs`/`-batch` slug that resolves in the registry is
// provably not a job (build-time collision assertion), so boards get board
// metadata here — never the "Opportunity Not Found" fallback below. The
// registry build shares the page component's feed fetch through React cache().
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug: slugOrId } = await params;
    if (isInvalidSlug(slugOrId)) {
        logRouteResult('/[slug] (crawler)', '404');
        notFound();
    }

    try {
        const registry = await loadTaxonomyRegistry();
        const resolved = registry ? resolveTaxonomySlug(registry, slugOrId) : null;
        if (resolved) {
            const feed = await fetchFeedIndex(false, undefined, true);
            const liveCount = (feed?.opportunities || []).filter((opp) => matchTaxonomy(opp, resolved)).length;
            return {
                title: boardTitle(resolved),
                description: boardDescription(resolved),
                alternates: { canonical: `/jobs/${boardCanonicalSlug(resolved)}` },
                // An empty board renders for users (never a 404) but must not
                // be indexed as a thin page.
                ...(liveCount === 0 ? { robots: { index: false, follow: true } } : null),
            };
        }
    } catch {
        // Registry failure falls through to the job path below.
    }

    try {
        const opportunity = await fetchOpportunityForMetadata(slugOrId);
        if (!opportunity) throw new Error('Opportunity not found');
        return await generateOpportunityMetadata(opportunity);
    } catch {
        return {
            title: 'Opportunity Not Found',
            description: 'This opportunity listing is no longer available.',
        };
    }
}

export default async function OpportunityDetailPage({ params }: Props) {
    const { slug: slugOrId } = await params;
    if (isInvalidSlug(slugOrId)) {
        logRouteResult('/[slug] (crawler)', '404');
        notFound();
    }

    // ── Taxonomy board branch (doc 22 §22.3) — registry hit renders the board ──
    const registry = await loadTaxonomyRegistry();
    const resolved = registry ? resolveTaxonomySlug(registry, slugOrId) : null;
    if (resolved) {
        // Board pages render card data only — lightweight index suffices.
        const feed = await fetchFeedIndex(false, undefined, true);
        const allJobs = feed?.opportunities || [];
        const boardJobs = allJobs.filter(opp => matchTaxonomy(opp, resolved));

        // Boards never 404: a resolving board slug is provably not a job
        // (build-time collision assertion), so zero live matches is an empty
        // filter — not a missing page. Empty boards render with an empty
        // state and noindex metadata (see generateMetadata); only unknown
        // slugs fall through to the job branch and its 404 below.
        logRouteResult('/[slug] (board)', '200');
        return (
            <Suspense fallback={<FeedPageSkeleton />}>
                <TopicBoardPage
                    resolved={resolved}
                    jobs={boardJobs}
                    title={boardTitle(resolved)}
                    cachedAt={feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now()}
                />
            </Suspense>
        );
    }

    let opportunityData: ExtendedOpportunity | null = null;
    let relatedOpportunitiesData: Opportunity[] = [];
    let validDirectoryLinks = { validSkills: new Set<string>(), validLocations: new Set<string>() };

    try {
        // Parallelize opportunity details and lightweight feed index fetching
        const [oppResult, feed] = await Promise.all([
            fetchOpportunityForPage(slugOrId),
            fetchFeedIndex(false, undefined, true)
        ]);

        opportunityData = oppResult;

        // Job not found in CDN feed — return a real 404 so Google doesn't
        // soft-404 the page (200 with error UI = Soft 404 in GSC).
        if (!opportunityData) {
            logRouteResult('/[slug]', '404');
            const { unstable_noStore } = await import('next/cache');
            unstable_noStore();
            notFound();
        }

        const expiry = getExpiryState(opportunityData);

        // SEO Enforcement: Redirect to slug if ID was used
        if (slugOrId === opportunityData.id && opportunityData.slug) {
            logRouteResult('/[slug]', '308');
            permanentRedirect(getOpportunityPath(getFeedBadgeLabel(opportunityData), opportunityData.slug));
        }

        // Expired pages stay live for grace period, then redirect to the type hub.
        if (expiry.pastGrace) {
            logRouteResult('/[slug]', '308');
            permanentRedirect(getTypeHubPath(getFeedBadgeLabel(opportunityData)));
        }

        if (feed?.opportunities) {
            relatedOpportunitiesData = getRelatedOpportunities(opportunityData, feed.opportunities);
            validDirectoryLinks = getValidDirectoryLinks(feed.opportunities);
        }
    } catch (err) {
        // Re-throw Next.js navigation signals (notFound, redirect) — they must propagate.
        // Only swallow genuine network/fetch failures.
        if (isNextNavigationError(err)) throw err;
        // CDN is temporarily down — render client with null so it can show retry UI
        // rather than hard 404-ing on a transient error.
    }

    if (opportunityData) {
        logRouteResult('/[slug]', '200');
    }

    // Server-rendered H1 + summary so crawlers always see real content —
    // the interactive detail view below is a Suspense-wrapped client
    // component whose static HTML is just a skeleton.
    const detailHeading = opportunityData ? (
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 sr-only">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
                {opportunityData.title} at {opportunityData.company}
            </h1>
            <p>
                {isInternshipOpportunity(opportunityData)
                    ? 'Internship'
                    : isWalkinOpportunity(opportunityData)
                        ? 'Walk-in drive'
                        : 'Job opening'}{' '}
                at {opportunityData.company}.
                {opportunityData.description
                    ? ` ${opportunityData.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)}`
                    : ''}
            </p>
        </div>
    ) : null;

    return (
        <>
            {detailHeading}
            {opportunityData && !getExpiryState(opportunityData).isExpired && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityJsonLd(opportunityData)) }}
                />
            )}
            <Suspense fallback={<OpportunityDetailSkeleton />}>
                <OpportunityDetailClient 
                    id={slugOrId} 
                    initialData={opportunityData as Opportunity} 
                    initialRelatedData={relatedOpportunitiesData}
                    validDirectoryLinks={{
                        validSkills: Array.from(validDirectoryLinks.validSkills),
                        validLocations: Array.from(validDirectoryLinks.validLocations)
                    }}
                />
            </Suspense>
        </>
    );
}
