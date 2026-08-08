import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import { fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import { cache } from 'react';

type Props = {
    params: Promise<{ slug: string }>;
};

export const revalidate = false;
// dynamicParams = true: allows newly published jobs to be dynamically generated on their first visit,
// rather than 404ing. This will result in 1 ISR write per new job. If we notice an ISR write burst,
// we may need to revisit this approach or check our cache tags.
export const dynamicParams = true;

// Redirect page does not need custom SEO indexing.
export const metadata: Metadata = {
    robots: {
        index: false,
        follow: true,
    },
};

const fetchGovernmentOpportunity = cache(async (slug: string) => {
    try {
        const feed = await fetchGovernmentFeed(false, undefined, true);
        return feed?.opportunities?.find((opp) => opp.slug === slug || opp.id === slug) || null;
    } catch {
        return null;
    }
});

export async function generateStaticParams() {
    try {
        const feed = await fetchGovernmentFeed(false, undefined, true);
        if (!feed?.opportunities) return [];
        return feed.opportunities.map((opp) => ({ slug: opp.slug || opp.id }));
    } catch {
        return [];
    }
}

export default async function GovernmentJobDetailPage({ params }: Props) {
    const { slug } = await params;
    const opp = await fetchGovernmentOpportunity(slug);

    if (!opp) {
        logRouteResult('/govt/[slug]', '404');
        notFound();
    }

    // Redirect to the canonical unified slug details page
    logRouteResult('/govt/[slug]', '307');
    redirect(getOpportunityPath(opp.type, opp.slug || opp.id));
}


