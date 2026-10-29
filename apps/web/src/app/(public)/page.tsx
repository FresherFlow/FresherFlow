import type { Metadata } from 'next';
import { HeroSection } from '@/features/landing/HeroSection';
import { BoardsSection } from '@/features/landing/BoardsSection';
// Hidden for now — the comparison block claims things we don't do yet.
// import { ComparisonSection } from '@/features/landing/ComparisonSection';
import { ProofSection } from '@/features/landing/ProofSection';
import { CompanyRegister } from '@/features/landing/CompanyRegister';
import { StatementBand } from '@/features/landing/StatementBand';
import { SmoothScroll } from '@/features/landing/SmoothScroll';

import { fetchFeedIndex, fetchCompaniesMetadata } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.

const LANDING_TITLE = 'FresherFlow — Jobs, powered by freshers';
const LANDING_DESCRIPTION =
    'Off-campus jobs, internships and walk-ins for freshers in India — shared by the community, linked straight to official pages.';

export const metadata: Metadata = {
    title: { absolute: LANDING_TITLE },
    description: LANDING_DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
        siteName: 'FresherFlow',
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        type: 'website',
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'FresherFlow — fresher jobs and internships in India' }],
    },
    twitter: { card: 'summary_large_image', title: LANDING_TITLE, description: LANDING_DESCRIPTION, images: ['/twitter-image'] },
};

export default async function LandingPage() {
    const [feed, companies] = await Promise.all([fetchFeedIndex(), fetchCompaniesMetadata()]);
    const opps = feed?.opportunities ?? [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Per-type counts (same groupings as the old single-enum `type` checks,
    // expressed in the independent taxonomy dimensions).
    const jobs = opps.filter((o) => matchesFeedType(o, 'JOB')).length;
    const internships = opps.filter((o) => matchesFeedType(o, 'INTERNSHIP')).length;
    const walkins = opps.filter((o) => matchesFeedType(o, 'WALKIN')).length;
    const govt = opps.filter((o) => matchesFeedType(o, 'GOVERNMENT')).length;

    // New today (posted since local midnight, capped by feed freshness)
    const newToday = opps.filter((o) => new Date(o.postedAt).getTime() >= startOfToday.getTime()).length;


    // Companies with live openings (top 8 by count)
    const companyCounts = new Map<string, { slug?: string; count: number }>();
    for (const o of opps) {
        const name = o.company?.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const meta = companies?.find((c) => c.name.toLowerCase() === key);
        const entry = companyCounts.get(key) ?? { slug: meta?.slug, count: 0 };
        entry.count += 1;
        if (!entry.slug && meta?.slug) entry.slug = meta.slug;
        companyCounts.set(key, entry);
    }
    const companyRows = [...companyCounts.entries()]
        .map(([name, v]) => ({ name, slug: v.slug, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // Latest postings for the proof board
    const latest = [...opps]
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
        .slice(0, 5)
        .map(toOpportunityCardDTO);

    const refreshedAt = feed?.generatedAt ? new Date(feed.generatedAt) : null;

    // The hero cannot know which job a visitor cares about. It used to
    // deep-link to `latest[0]#discussion`, which dropped everyone into an
    // unrelated stranger's thread on whichever job happened to be first, and
    // fell back to /jobs on an empty feed — the same target as "Browse the
    // board". Ask/Discuss now goes to the discussions board, which is the real
    // entry point for a question with no job attached yet.
    const discussHref = '/community?tab=discussions';

    return (
        <>
            <SmoothScroll />
            {/* No Organization JSON-LD here: the root layout already emits one from
                <head>, and this block duplicated it with a conflicting shape. */}

            <HeroSection newToday={newToday} refreshedAt={refreshedAt} discussHref={discussHref} />
            <BoardsSection data={{ jobs, internships, walkins, govt }} />
            <ProofSection latest={latest} />
            <CompanyRegister companies={companyRows} />
            <StatementBand />
        </>
    );
}
