import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from '@/features/jobs/components/detail/OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/features/jobs/components/OpportunitySkeletons';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import {
    fetchOpportunityForPage,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    generateOpportunityBreadcrumbsJsonLd,
    getExpiryState,
    getTypeHubPath,
    ExtendedOpportunity
} from '@/features/jobs/domain/opportunitySeo';
import { fetchGovernmentFeed, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { getRelatedOpportunities, getValidDirectoryLinks } from '@/features/jobs/utils/detailUtils';
import {
    buildTaxonomyRegistry,
    resolveTaxonomySlug,
    resolveLegacyBoardSlug,
    boardCanonicalSlug,
    matchTaxonomy,
    assertRegistryJobSlugCollision,
    TaxonomyRegistry,
} from '@/features/jobs/domain/taxonomy';
import { TopicBoardPage } from '@/features/jobs/components/TopicBoardPage';
import { truncateTitleByPixels, truncateDescription } from '@/lib/seo/seoMetrics';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { FeedPageSkeleton } from '@/features/jobs/components/OpportunitySkeletons';


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
        case 'combo': return `${resolved.combo.roleLabel} Jobs in ${resolved.combo.cityLabel} for Freshers`;
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
        case 'combo':
            return `Browse verified fresher ${resolved.combo.roleLabel} opportunities in ${resolved.combo.cityLabel}, with direct official application links.`;
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

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug: slugOrId } = await params;
    if (isInvalidSlug(slugOrId)) {
        logRouteResult('/[slug] (crawler)', '404');
        notFound();
    }

    // Taxonomy boards resolve BEFORE job detail — one /jobs namespace.
    // Canonical board URLs carry the `-jobs` suffix (combos excepted).
    const registry = await loadTaxonomyRegistry();
    const resolved = registry ? resolveTaxonomySlug(registry, slugOrId) : null;
    if (resolved) {
        const rawTitle = boardTitle(resolved);
        const title = truncateTitleByPixels(rawTitle);
        const description = truncateDescription(boardDescription(resolved));
        const base = SITE_URL.replace(/\/+$/, '');
        return {
            title,
            description,
            alternates: { canonical: `${base}/jobs/${boardCanonicalSlug(resolved)}` },
            openGraph: {
                title,
                description,
                type: 'website',
                images: [{ url: '/main.png', width: 1200, height: 630, alt: title }],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: ['/main.png'],
            },
        };
    }

    try {
        const opportunity = await fetchOpportunityForPage(slugOrId);
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
    // Legacy unsuffixed board URLs 308 to the canonical `-jobs` form.
    const registry = await loadTaxonomyRegistry();
    const resolved = registry ? resolveTaxonomySlug(registry, slugOrId) : null;
    if (!resolved && registry) {
        const legacyCanonical = resolveLegacyBoardSlug(registry, slugOrId);
        if (legacyCanonical) {
            logRouteResult('/[slug] (board legacy)', '308');
            permanentRedirect(`/jobs/${legacyCanonical}`);
        }
    }
    if (resolved) {
        // Board pages render card data only — lightweight index suffices.
        const feed = await fetchFeedIndex(false, undefined, true);
        const allJobs = feed?.opportunities || [];
        const boardJobs = allJobs.filter(opp => matchTaxonomy(opp, resolved));

        // Inventory-gated: zero live matches = real 404, never a thin page.
        if (boardJobs.length === 0) {
            logRouteResult('/[slug] (board)', '404');
            notFound();
        }

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
            permanentRedirect(getOpportunityPath(opportunityData.type, opportunityData.slug));
        }

        // Expired pages stay live for grace period, then redirect to the type hub.
        if (expiry.pastGrace) {
            logRouteResult('/[slug]', '308');
            permanentRedirect(getTypeHubPath(opportunityData.type));
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

    return (
        <>
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
