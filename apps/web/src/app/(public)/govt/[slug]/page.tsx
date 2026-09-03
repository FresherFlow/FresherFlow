import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from '../../jobs/[slug]/OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import { fetchBootstrapFeed, fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import { OpportunityType } from '@fresherflow/types';
import { getRelatedOpportunities } from '@/features/opportunities/utils/detailUtils';
import {
    fetchOpportunityForPage,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    generateOpportunityBreadcrumbsJsonLd,
    getExpiryState,
    ExtendedOpportunity
} from '../../jobs/[slug]/opportunitySeo';

export const revalidate = false;
export const dynamicParams = true;


const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined', 'login', 'jobs', 'saved', 'tracker']);
function isInvalidSlug(slug: string): boolean {
    const lower = slug.toLowerCase();
    return CRAWLER_PATHS.has(lower) || lower.startsWith('api') || lower.includes('/') || lower.includes('.') || lower.includes('\\');
}

export async function generateStaticParams() {
    try {
        const [feed, bootstrapFeed] = await Promise.all([
            fetchGovernmentFeed(false, undefined, true),
            fetchBootstrapFeed(false, undefined, true),
        ]);
        const opps = [
            ...(feed?.opportunities || []),
            ...(bootstrapFeed?.opportunities?.filter(o => o.type === OpportunityType.GOVERNMENT || Boolean(o.governmentJobDetails)) || [])
        ];
        const slugs = new Set<string>();
        opps.forEach(opp => {
            const slug = opp.slug || opp.id;
            if (slug) slugs.add(slug);
        });
        return Array.from(slugs).map(slug => ({ slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    if (isInvalidSlug(slug)) notFound();
    try {
        const opp = await fetchOpportunityForPage(slug);
        if (!opp) throw new Error('Not found');
        return await generateOpportunityMetadata(opp as ExtendedOpportunity);
    } catch {
        return { title: 'Opportunity Not Found', description: 'This opportunity listing is no longer available.' };
    }
}

/** Returns true for errors thrown by notFound() or redirect()/permanentRedirect() in Next.js 15+/16. */
function isNextNavigationError(err: unknown): boolean {
    const digest = (err as { digest?: string })?.digest ?? '';
    return digest === 'NEXT_HTTP_ERROR_FALLBACK;404' || digest.startsWith('NEXT_REDIRECT');
}

export default async function GovernmentJobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (isInvalidSlug(slug)) {
        logRouteResult('/govt/[slug] (crawler)', '404');
        notFound();
    }

    let opp: ExtendedOpportunity | null = null;
    let related: ReturnType<typeof getRelatedOpportunities> = [];

    try {
        const [oppResult, govtFeed] = await Promise.all([
            fetchOpportunityForPage(slug),
            fetchGovernmentFeed(false, undefined, true)
        ]);

        opp = oppResult;

        if (!opp) {
            logRouteResult('/govt/[slug]', '404');
            const { unstable_noStore } = await import('next/cache');
            unstable_noStore();
            notFound();
        }

        if (slug === opp.id && opp.slug) {
            logRouteResult('/govt/[slug]', '308');
            permanentRedirect(getOpportunityPath(opp.type, opp.slug));
        }

        if (getExpiryState(opp).pastGrace) {
            logRouteResult('/govt/[slug]', '308');
            permanentRedirect('/govt');
        }

        related = govtFeed?.opportunities ? getRelatedOpportunities(opp, govtFeed.opportunities) : [];
    } catch (err) {
        // Re-throw Next.js navigation signals (notFound, redirect) — they must propagate.
        // Only swallow genuine network/fetch failures.
        if (isNextNavigationError(err)) throw err;
        // CDN is temporarily down — fall through with null opp so the client can show retry UI.
    }

    logRouteResult('/govt/[slug]', opp ? '200' : '500');

    return (
        <>
            {opp && !getExpiryState(opp).isExpired && (
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

