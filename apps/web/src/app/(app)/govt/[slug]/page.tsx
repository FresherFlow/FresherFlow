import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from '../../jobs/[slug]/OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import { fetchBootstrapFeed, fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import { getRelatedOpportunities } from '@/features/opportunities/utils/detailUtils';
import { generateOpportunityMetadata, generateOpportunityJsonLd, generateOpportunityBreadcrumbsJsonLd, getExpiryState, ExtendedOpportunity } from '../../jobs/[slug]/opportunitySeo';

export const revalidate = false;
export const dynamicParams = false;

const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined', 'login', 'jobs', 'saved', 'tracker']);
function isInvalidSlug(slug: string): boolean {
    const lower = slug.toLowerCase();
    return CRAWLER_PATHS.has(lower) || lower.startsWith('api') || lower.includes('/') || lower.includes('.') || lower.includes('\\');
}

export async function generateStaticParams() {
    try {
        const feed = await fetchGovernmentFeed(false, undefined, true);
        if (!feed?.opportunities) return [];
        return feed.opportunities.map((opp) => ({ slug: opp.slug || opp.id }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    if (isInvalidSlug(slug)) notFound();
    try {
        const feed = await fetchGovernmentFeed(false, undefined, true);
        const opp = feed?.opportunities?.find((o) => o.slug === slug || o.id === slug);
        if (!opp) throw new Error('Not found');
        return await generateOpportunityMetadata(opp as ExtendedOpportunity);
    } catch {
        return { title: 'Opportunity Not Found', description: 'This opportunity listing is no longer available.' };
    }
}

export default async function GovernmentJobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (isInvalidSlug(slug)) {
        logRouteResult('/govt/[slug] (crawler)', '404');
        notFound();
    }

    const [govtFeed, bootstrapFeed] = await Promise.all([
        fetchGovernmentFeed(false, undefined, true),
        fetchBootstrapFeed(false, undefined, true)
    ]);

    const opp = govtFeed?.opportunities?.find((o) => o.slug === slug || o.id === slug) as ExtendedOpportunity | undefined;

    if (!opp) {
        logRouteResult('/govt/[slug]', '404');
        notFound();
    }

    if (slug === opp.id && opp.slug) {
        logRouteResult('/govt/[slug]', '308');
        permanentRedirect(getOpportunityPath(opp.type, opp.slug));
    }

    if (getExpiryState(opp).pastGrace) {
        logRouteResult('/govt/[slug]', '308');
        permanentRedirect('/jobs');
    }

    const related = bootstrapFeed?.opportunities ? getRelatedOpportunities(opp, bootstrapFeed.opportunities) : [];

    logRouteResult('/govt/[slug]', '200');

    return (
        <>
            {!getExpiryState(opp).isExpired && (
                <>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityJsonLd(opp)) }} />
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityBreadcrumbsJsonLd(opp)) }} />
                </>
            )}
            <Suspense fallback={<OpportunityDetailSkeleton />}>
                <OpportunityDetailClient id={slug} initialData={opp} initialRelatedData={related} />
            </Suspense>
        </>
    );
}

