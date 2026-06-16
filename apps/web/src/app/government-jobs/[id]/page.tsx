import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import { fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import { cache } from 'react';

type Props = {
    params: Promise<{ id: string }>;
};

export const revalidate = false;
export const dynamicParams = false;

// Redirect page does not need custom SEO indexing.
export const metadata: Metadata = {
    robots: {
        index: false,
        follow: true,
    },
};

const fetchGovernmentOpportunity = cache(async (id: string) => {
    try {
        const feed = await fetchGovernmentFeed();
        return feed?.opportunities?.find((opp) => opp.id === id) || null;
    } catch {
        return null;
    }
});

export async function generateStaticParams() {
    try {
        const feed = await fetchGovernmentFeed();
        if (!feed?.opportunities) return [];
        return feed.opportunities.map((opp) => ({ id: opp.id }));
    } catch {
        return [];
    }
}

export default async function GovernmentJobDetailPage({ params }: Props) {
    const { id } = await params;
    const opp = await fetchGovernmentOpportunity(id);

    if (!opp) {
        logRouteResult('/government-jobs/[id]', '404');
        notFound();
    }

    // Redirect to the canonical unified slug details page
    logRouteResult('/government-jobs/[id]', '307');
    redirect(getOpportunityPath(opp.type, opp.slug || opp.id));
}


