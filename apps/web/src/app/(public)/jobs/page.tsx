import { Metadata } from 'next';
import { Suspense } from 'react';
import JobsPageClient from '@/features/jobs/components/JobsPageClient';
import { fetchCompaniesMetadata, fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { buildCompanyFollowMap } from '@/features/companies/utils/companyDirectory';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
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
        fetchFeedIndex(false, undefined, true),
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
        <Suspense fallback={null}>
            <JobsPageClient initialData={initialData} companyDirectory={companyDirectory} />
        </Suspense>
    );
}
