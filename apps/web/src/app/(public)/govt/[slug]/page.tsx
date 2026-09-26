import { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { logRouteResult } from '@/lib/observability';
import { Suspense } from 'react';
import OpportunityDetailClient from '@/features/jobs/components/detail/OpportunityDetailClient';
import { Skeleton } from '@/ui/Skeleton';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import { fetchFeedIndex, fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import { getFeedBadgeLabel, isGovernmentOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { getRelatedOpportunities } from '@/features/jobs/utils/detailUtils';
import {
    fetchOpportunityForPage,
    generateOpportunityMetadata,
    generateOpportunityJsonLd,
    generateOpportunityBreadcrumbsJsonLd,
    getExpiryState,
    ExtendedOpportunity
} from '@/features/jobs/domain/opportunitySeo';

export const revalidate = false;
export const dynamicParams = true;


const CRAWLER_PATHS = new Set(['wp-admin', 'wp-login.php', 'xmlrpc.php', 'ads.txt', 'phpmyadmin', 'admin.php', 'demo', 'generate', 'blog', 'null', 'undefined', 'login', 'jobs', 'saved', 'tracker']);
function isInvalidSlug(slug: string): boolean {
    const lower = slug.toLowerCase();
    return CRAWLER_PATHS.has(lower) || lower.startsWith('api') || lower.includes('/') || lower.includes('.') || lower.includes('\\');
}

export async function generateStaticParams() {
    try {
        const [feed, feedIndex] = await Promise.all([
            fetchGovernmentFeed(false, undefined, true),
            fetchFeedIndex(false, undefined, true),
        ]);
        const opps = [
            ...(feed?.opportunities || []),
            ...(feedIndex?.opportunities?.filter(o => isGovernmentOpportunity(o)) || [])
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

function GovernmentDetailSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6" aria-hidden="true">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton variant="pill" className="h-5 w-20" />
                                    <Skeleton variant="pill" className="h-5 w-16" />
                                </div>
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-7 w-3/4" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                            <Skeleton variant="pill" className="h-16 w-16" />
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="border-b border-border bg-muted/30 px-5 py-3">
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="space-y-3 p-5">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <Skeleton className="h-4 w-40" />
                        <div className="mt-4 space-y-3">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-11/12" />
                            <Skeleton className="h-3 w-4/5" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-border bg-card p-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-4 h-3 w-3/4" />
                            <Skeleton className="mt-2 h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
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
            permanentRedirect(getOpportunityPath(getFeedBadgeLabel(opp), opp.slug));
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
            <Suspense fallback={<GovernmentDetailSkeleton />}>
                <OpportunityDetailClient id={slug} initialData={opp} initialRelatedData={related} />
            </Suspense>
        </>
    );
}

