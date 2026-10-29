import { Metadata } from 'next';
import { Suspense } from 'react';
import JobsPageClient from '@/features/jobs/components/JobsPageClient';
import { Skeleton } from '@/ui/Skeleton';
import { fetchCompaniesMetadata, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { buildCompanyFollowMap } from '@/features/companies/utils/companyDirectory';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
    description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
    alternates: {
        canonical: '/jobs',
    },
    openGraph: {
        title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
        description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified fresher jobs on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
        description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
        images: ['/main.png'],
    },
};

/**
 * The route is statically prerendered and `JobsPageClient` reads
 * `useSearchParams`, so the whole subtree sits behind Suspense and this
 * fallback is what ships in the HTML. It was `null`: until the client bundle
 * hydrated, /jobs served an empty <main>.
 *
 * This fallback mirrors the loaded desktop list rather than approximating it:
 * same header height, same 832px reading column, same 64px row rhythm. The
 * point is that hydration replaces rows in place — a differently-shaped
 * skeleton read as the page loading twice.
 */
function JobsShellFallback() {
    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6" role="status" aria-label="Loading jobs">
            <div className="flex h-[50px] items-center justify-between gap-3 border-b border-border/50">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-xl" />
                    <Skeleton className="h-8 w-20 rounded-xl" />
                    <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
            </div>
            <div className="ff-reading-col mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-2/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                        <Skeleton className="h-5 w-5 shrink-0 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default async function JobsPage() {
    // Single page of the bootstrap feed (not the whole thing): the
    // split-view detail pane renders the job description from its list item
    // and never refetches when initialData exists. The remaining feed is
    // hydrated post-paint by useOpportunitiesFeed from the public CDN asset,
    // so this route's HTML no longer dumps the entire dataset into view-source.
    //
    // LOCKS: keep in sync with public/worker CORS + cache policy decisions
    // (docs/work/TASKS.md). The DTO map keeps the payload shape identical to
    // sibling routes and lets the pane fetch a single full detail on demand
    // instead of needing all descriptions inlined.
    // Lightweight feed-index (~565KB raw / ~100KB gzip vs ~2MB bootstrap):
    // card-rendering fields only. Detail pane upgrades descriptions on demand
    // via jobs/{id}.json shards through useOpportunityDetail.
    // Companies metadata is fetched alongside the index so the Following tab can
    // show a followed company's real name, logo and live role count — the same
    // values /companies renders (buildCompanyDirectory). Both fetches are
    // CDN-cached and shared with the companies route, so this is a cache hit in
    // production.
    const [feedIndexData, companiesMetadata] = await Promise.all([
        fetchFeedIndex(),
        fetchCompaniesMetadata(),
    ]);
    const opportunities = feedIndexData?.opportunities || [];
    const companyDirectory = buildCompanyFollowMap(opportunities, companiesMetadata || []);
    const initialData = opportunities.length ? {
        opportunities: opportunities.slice(0, FEED_PAGE_SIZE),
        total: feedIndexData?.count ?? opportunities.length,
        cachedAt: new Date(feedIndexData?.generatedAt || Date.now()).getTime(),
        partial: (feedIndexData?.count ?? opportunities.length) > FEED_PAGE_SIZE,
    } : null;

    return (
        <Suspense fallback={<JobsShellFallback />}>
            <JobsPageClient initialData={initialData} companyDirectory={companyDirectory} />
        </Suspense>
    );
}
