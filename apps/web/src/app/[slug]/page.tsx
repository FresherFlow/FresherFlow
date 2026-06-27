import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from './OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/ui/Skeleton';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import {
    fetchOpportunityForPage,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    generateOpportunityBreadcrumbsJsonLd,
    getExpiryState,
    getTypeHubPath,
    ExtendedOpportunity
} from './opportunitySeo';

const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined']);

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
        const { fetchBootstrapFeed, fetchGovernmentFeed, fetchExpiredFeed } = await import('@/lib/api/cdnFeed');
        const [feed, govtFeed, expiredFeed] = await Promise.all([
            fetchBootstrapFeed(),
            fetchGovernmentFeed(),
            fetchExpiredFeed()
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

        expiredFeed?.opportunities?.forEach((opp) => {
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
    let opportunityData: ExtendedOpportunity | null = null;
    let relatedOpportunitiesData: Opportunity[] = [];

    try {
        opportunityData = await fetchOpportunityForPage(slugOrId);

        // Job not found in CDN feed — return a real 404 so Google doesn't
        // soft-404 the page (200 with error UI = Soft 404 in GSC).
        if (!opportunityData) {
            logRouteResult('/[slug]', '404');
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

        // Server-Side Related Opportunities Resolution
        // fetchOpportunityForPage already fetched the bootstrap feed internally.
        // Re-use it via a second call — Next.js deduplicates identical fetch() calls
        // within the same render pass (same URL + options = cache hit, no extra network I/O).
        const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
        const feed = await fetchBootstrapFeed(false, undefined, true);
        if (feed?.opportunities) {
            const { getRelatedOpportunities } = await import('@/features/opportunities/utils/detailUtils');
            relatedOpportunitiesData = getRelatedOpportunities(opportunityData, feed.opportunities);
        }
    } catch (err) {
        // Re-throw Next.js navigation errors (notFound, redirect) so they work correctly.
        // Only swallow genuine network/fetch failures.
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NEXT_NOT_FOUND' || msg === 'NEXT_REDIRECT') throw err;
        // CDN is temporarily down — render client with null so it can show retry UI
        // rather than hard 404-ing on a transient error.
    }

    if (opportunityData) {
        logRouteResult('/[slug]', '200');
    }

    return (
        <>
            {opportunityData && !getExpiryState(opportunityData).isExpired && (
                <>
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityJsonLd(opportunityData)) }}
                    />
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityBreadcrumbsJsonLd(opportunityData)) }}
                    />
                </>
            )}
            <Suspense fallback={<OpportunityDetailSkeleton />}>
                <OpportunityDetailClient 
                    id={slugOrId} 
                    initialData={opportunityData as Opportunity} 
                    initialRelatedData={relatedOpportunitiesData}
                />
            </Suspense>
        </>
    );
}
