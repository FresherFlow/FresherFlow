import { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Fresher Jobs in India | Off-Campus Jobs & Walk-ins',
    description: 'Browse verified jobs for freshers across India, including full-time roles, off-campus drives, internships and walk-in interviews.',
    keywords: 'fresher jobs, jobs for freshers, fresher jobs India, off campus jobs, entry level jobs, graduate jobs, walk in jobs',
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
    const feedIndexData = await fetchFeedIndex(false, undefined, true);
    const opportunities = feedIndexData?.opportunities || [];
    const initialData = opportunities.length ? {
        opportunities: opportunities.slice(0, FEED_PAGE_SIZE),
        total: feedIndexData?.count ?? opportunities.length,
        cachedAt: new Date(feedIndexData?.generatedAt || Date.now()).getTime(),
        partial: (feedIndexData?.count ?? opportunities.length) > FEED_PAGE_SIZE,
    } : null;

    return <CategoryPage type={null} initialData={initialData} />;
}
