import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { Suspense } from 'react';
import OpportunityDetailClient from './OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/components/ui/Skeleton';
import { getOpportunityPath } from '@/lib/opportunityPath';
import {
    fetchOpportunityForPage,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    getExpiryState,
    getTypeHubPath,
    ExtendedOpportunity
} from './opportunitySeo';

type Props = {
    params: Promise<{ slug: string }>;
};

// On-Demand Revalidation is used for this route via /api/revalidate
export const revalidate = false;

// dynamicParams = true: allows Next.js to render new job pages dynamically on-demand,
// which is essential for development and for newly published jobs in production.
export const dynamicParams = true;

export async function generateStaticParams() {
    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    if (!feed?.opportunities) return [];
    return feed.opportunities.map((opp) => ({ slug: opp.slug ?? opp.id }));
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug: slugOrId } = await params;
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
    let opportunityData: ExtendedOpportunity | null = null;
    let relatedOpportunitiesData: Opportunity[] = [];

    try {
        opportunityData = await fetchOpportunityForPage(slugOrId);

        // Job not found in CDN feed — return a real 404 so Google doesn't
        // soft-404 the page (200 with error UI = Soft 404 in GSC).
        if (!opportunityData) {
            const { unstable_noStore } = await import('next/cache');
            unstable_noStore();
            notFound();
        }

        const expiry = getExpiryState(opportunityData);

        // SEO Enforcement: Redirect to slug if ID was used
        if (slugOrId === opportunityData.id && opportunityData.slug) {
            permanentRedirect(getOpportunityPath(opportunityData.type, opportunityData.slug));
        }

        // Expired pages stay live for grace period, then redirect to the type hub.
        if (expiry.pastGrace) {
            permanentRedirect(getTypeHubPath(opportunityData.type));
        }

        // Server-Side Related Opportunities Resolution
        // fetchOpportunityForPage already fetched the bootstrap feed internally.
        // Re-use it via a second call — Next.js deduplicates identical fetch() calls
        // within the same render pass (same URL + options = cache hit, no extra network I/O).
        const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
        const feed = await fetchBootstrapFeed();
        if (feed?.opportunities) {
            const { getRelatedOpportunities } = await import('./detailUtils');
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
                />
            </Suspense>
        </>
    );
}
