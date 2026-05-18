import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSiteMode } from '@/lib/siteModeServer';
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
    const siteMode = await getSiteMode();
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
    const siteMode = await getSiteMode();
    let opportunityData: ExtendedOpportunity | null = null;

    try {
        opportunityData = await fetchOpportunityForPage(slugOrId, siteMode);
        if (!opportunityData) throw new Error('Opportunity not found');

        const expiry = getExpiryState(opportunityData);

        // SEO Enforcement: Redirect to slug if ID was used
        if (slugOrId === opportunityData.id && opportunityData.slug) {
            permanentRedirect(getOpportunityPath(opportunityData.type, opportunityData.slug));
        }

        // Expired pages stay live for grace period, then redirect to the type hub.
        if (expiry.pastGrace) {
            permanentRedirect(getTypeHubPath(opportunityData.type));
        }
    } catch {
        // Fallback handled by client component (loading/404)
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
                <OpportunityDetailClient id={slugOrId} initialData={opportunityData as Opportunity} />
            </Suspense>
        </>
    );
}
