import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense, cache } from 'react';
import OpportunityDetailClient from '@/features/jobs/components/detail/OpportunityDetailClient';
import { OpportunityDetailSkeleton, FeedPageSkeleton } from '@/features/jobs/components/OpportunitySkeletons';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import {
    fetchOpportunityForPage,
    fetchOpportunityForMetadata,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    getExpiryState,
    getTypeHubPath,
    getDetailType,
    ExtendedOpportunity
} from '@/features/jobs/domain/opportunitySeo';
import { fetchGovernmentFeed, fetchFeedIndex, fetchCompaniesMetadata } from '@/lib/api/feedServer';
import { CompanySlugger } from '@/features/companies/utils/companySlugger';
import { getRelatedOpportunities, getValidDirectoryLinks } from '@/features/jobs/utils/detailUtils';
import { getJobDiscussionForSeo } from '@/features/jobs/domain/jobDiscussionSeo';
import { getFeedBadgeLabel, isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { filterOpportunities } from '@/features/jobs/utils/filterOpportunities';
import { getDeclaredPassoutYears } from '@/features/jobs/domain/passoutYears';
import {
    buildTaxonomyRegistry,
    resolveTaxonomySlug,
    boardFilters,
    boardCanonicalSlug,
    assertRegistryJobSlugCollision,
    TaxonomyRegistry,
    ResolvedTaxonomy,
} from '@/features/jobs/domain/taxonomy';
import { TopicBoardPage } from '@/features/jobs/components/TopicBoardPage';



/** Returns true for errors thrown by notFound() or redirect()/permanentRedirect() in Next.js 15+/16. */
function isNextNavigationError(err: unknown): boolean {
    const digest = (err as { digest?: string })?.digest ?? '';
    return digest === 'NEXT_HTTP_ERROR_FALLBACK;404' || digest.startsWith('NEXT_REDIRECT');
}

const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined', 'login', 'jobs', 'saved', 'tracker', 'api', 'graphql', 'wp-content', 'wp-includes', 'wp-json', 'server-status', 'phpinfo', 'test', 'setup', 'install', 'config', 'backup', 'db', 'sql', 'manager', 'console', 'jenkins', 'actuator', 'health', 'metrics', 'swagger', 'swagger-ui', 'openapi', 'rest', 'docs', '.env', '.git']);

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
const loadTaxonomyRegistry = cache(async (): Promise<TaxonomyRegistry | null> => {
    try {
        const feed = await fetchFeedIndex();
        const registry = buildTaxonomyRegistry(feed?.opportunities || []);
        assertRegistryJobSlugCollision(registry, getJobSlugs(feed));
        return registry;
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[taxonomy] registry build failed:', err instanceof Error ? err.message : err);
        }
        return null;
    }
});

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

/**
 * Shared board job filtering, memoised per-request via React.cache().
 * Both generateMetadata and the body branch filter the same feed with the
 * same resolved taxonomy — this helper dedups the O(n) CPU work so it runs
 * once per request instead of twice.
 */
const getBoardJobs = cache(
    (_registry: TaxonomyRegistry, resolved: ResolvedTaxonomy, jobs: Opportunity[]): { boardJobs: Opportunity[]; liveCount: number } => {
        // A batch board lists listings that explicitly declare that batch.
        // The feed filter is broader on purpose: a listing with no batch
        // restriction is open to everyone. That rule must not inflate a board
        // titled "Jobs for 2026 Passouts".
        if (resolved.kind === 'year') {
            const boardJobs = jobs.filter((opp) => getDeclaredPassoutYears(opp).includes(resolved.year));
            return { boardJobs, liveCount: boardJobs.length };
        }
        const boardJobs = filterOpportunities(jobs, boardFilters(resolved) as unknown as Parameters<typeof filterOpportunities>[1]);
        return { boardJobs, liveCount: boardJobs.length };
    },
);

type Props = {
    params: Promise<{ slug: string }>;
};

// No ISR timer, no ISR writes on bogus slugs. Route is dynamically rendered
// on every request (force-dynamic), so crawler-invented slugs never hit the
// ISR cache. Trade-off: compute on every request instead of edge cache.
export const dynamic = 'force-dynamic';

// dynamicParams = true: allows newly published jobs to be dynamically generated on their first visit,
// rather than 404ing.
export const dynamicParams = true;


export async function generateStaticParams() {
    // Generate on-demand only - avoid build-time pre-rendering of all job pages
    return [];
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
            const feed = await fetchFeedIndex();
            const { liveCount } = getBoardJobs(registry!, resolved, feed?.opportunities || []);
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
        // Metadata must resolve the SAME opportunity the body renders.
        // fetchOpportunityForMetadata is shard-only; when the shard misses it
        // returns null even though the body below still finds the job through
        // fetchOpportunityForPage's index/government/expired/bootstrap fallback
        // — which is React.cache()-shared with this request, so the fallback
        // here costs no extra fetch. Without it a live 200 page ships a
        // "Job Not Found" title.
        const opportunity =
            (await fetchOpportunityForMetadata(slugOrId)) ?? (await fetchOpportunityForPage(slugOrId));
        if (!opportunity) throw new Error('Opportunity not found');
        return await generateOpportunityMetadata(opportunity);
    } catch {
        return {
            title: 'Job Not Found',
            description: 'This job listing is no longer available.',
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
        const feed = await fetchFeedIndex();
        const { boardJobs } = getBoardJobs(registry!, resolved, feed?.opportunities || []);

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
                    jobs={resolved.kind === 'year' ? boardJobs : (feed?.opportunities || [])}
                    title={boardTitle(resolved)}
                    cachedAt={feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now()}
                />
            </Suspense>
        );
    }

    let opportunityData: ExtendedOpportunity | null = null;
    let relatedOpportunitiesData: Opportunity[] = [];
    let validDirectoryLinks = { validSkills: new Set<string>(), validLocations: new Set<string>() };
    // Discussion structured data: start the Firebase RTDB read as early as
    // possible so it runs in parallel with the remaining server work
    // (companies metadata, related opportunities). Awaited below at render time.
    let seoDiscussionPromise: ReturnType<typeof getJobDiscussionForSeo> | null = null;

    try {
        // Parallelize opportunity details and lightweight feed index fetching
        const [oppResult, feed] = await Promise.all([
            fetchOpportunityForPage(slugOrId),
            fetchFeedIndex()
        ]);

        opportunityData = oppResult;

        // Kick off the discussion read now that we have the opportunity id.
        // It runs concurrently with fetchCompaniesMetadata() and the related
        // opportunities work further down in this try block.
        seoDiscussionPromise = opportunityData && !getExpiryState(opportunityData).isExpired
            ? getJobDiscussionForSeo(opportunityData.id)
            : null;

        // Job not found in CDN feed. `notFound()` renders the 404 UI and
        // injects the noindex tag, so Google keeps the page out of results
        // instead of soft-404ing a 200 that looks like a listing.
        //
        if (!opportunityData) {
            logRouteResult('/[slug]', '404');
            notFound();
        }

        // Government and walk-in drives each have their own namespace. Use the
        // same predicate the canonical/JSON-LD builder uses so a listing that
        // is both never gets a /drives URL with a /govt canonical (or vice
        // versa). Existing bookmarks and shared links resolve in one hop.
        const detailType = getDetailType(opportunityData);
        if (detailType) {
            permanentRedirect(getOpportunityPath(detailType, opportunityData.slug || opportunityData.id));
        }

        const expiry = getExpiryState(opportunityData);

        // SEO Enforcement: Redirect to slug if ID was used
        if (slugOrId === opportunityData.id && opportunityData.slug) {
            logRouteResult('/[slug]', '308');
            permanentRedirect(getOpportunityPath(getFeedBadgeLabel(opportunityData), opportunityData.slug));
        }

        // The listing payload carries no company slug, so the detail links and
        // the JSON-LD breadcrumb would each guess one from the website. Resolve
        // it with the same slugger `/companies/{slug}` uses, so the link points
        // at the page that actually exists.
        const companyDirectory = await fetchCompaniesMetadata().catch(() => null);
        const companySlug = companyDirectory ? new CompanySlugger(companyDirectory).getSlug(opportunityData) : null;
        if (companySlug) {
            opportunityData = { ...opportunityData, companySlug } as ExtendedOpportunity;
        }

        // Expired pages stay live for the grace period, then move to the most
        // specific live page. Company profiles are evergreen now, so they are
        // the better destination; the type board is the fallback when the
        // company cannot be resolved. A 308 beats a 404 or a dead 200 here.
        if (expiry.pastGrace) {
            logRouteResult('/[slug]', '308');
            permanentRedirect(
                companySlug ? `/companies/${companySlug}` : getTypeHubPath(getFeedBadgeLabel(opportunityData))
            );
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
    // Discussion structured data: read only for a live listing whose index says
    // the thread has comments. Null leaves the JSON-LD exactly as before.
    const seoDiscussion = await seoDiscussionPromise;

    const detailHeading = opportunityData ? (
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 sr-only">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
                {opportunityData.title} at {opportunityData.company}
            </h1>
            <p>
                {isWalkinOpportunity(opportunityData)
                    ? 'Walk-in drive'
                    : isInternshipOpportunity(opportunityData)
                        ? 'Internship'
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
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityJsonLd(opportunityData, seoDiscussion)) }}
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
            {/* Server-rendered because the FAQPage JSON-LD above describes it:
                Google requires the Q&A to be visible on the page, not embedded
                in schema alone. Renders nothing when no question has an answer. */}
            {seoDiscussion?.faqs && seoDiscussion.faqs.length > 0 && (
                <section className="mx-auto w-full max-w-4xl px-4 pb-10">
                    <h2 className="text-lg font-bold text-foreground">Questions freshers asked</h2>
                    <dl className="mt-4 space-y-4">
                        {seoDiscussion.faqs.map((faq) => (
                            <div key={faq.question}>
                                <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
                                <dd className="mt-1 text-sm text-muted-foreground">{faq.answer}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}
        </>
    );
}
