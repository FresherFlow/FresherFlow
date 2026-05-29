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
    params: Promise<{ id: string }>;
};

// ISR for public detail pages to absorb bot/preview traffic at CDN.
export const revalidate = 3600;

// Allow dynamic rendering and ISR caching for newly published opportunities using the CDN JSON feed
export const dynamicParams = true;

export async function generateStaticParams() {
    const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
    const feed = await fetchBootstrapFeed();
    
    if (!feed?.opportunities) return [];
    
    const params: { id: string }[] = [];
    for (const opp of feed.opportunities) {
        if (opp.slug) params.push({ id: opp.slug });
        if (opp.id) params.push({ id: opp.id });
    }
    
    return params;
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: slugOrId } = await params;
    const siteMode = 'private';
    try {
        const opportunity = await fetchOpportunityForPage(slugOrId, siteMode);
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
    const { id: slugOrId } = await params;
    const siteMode = 'private';
    let opportunityData: ExtendedOpportunity | null = null;

    let relatedOpportunitiesData: Opportunity[] = [];

    try {
        opportunityData = await fetchOpportunityForPage(slugOrId, siteMode);

        // Job not found in CDN feed — return a real 404 so Google doesn't
        // soft-404 the page (200 with error UI = Soft 404 in GSC).
        if (!opportunityData) {
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
