import type { Metadata } from 'next';
import { SITE_TITLE } from '../layout';
import { HeroSection } from '@/features/landing/HeroSection';
import { LiveBoard } from '@/features/landing/LiveBoard';
import { TaglineReveal } from '@/features/landing/TaglineReveal';
import { ClaimsSection } from '@/features/landing/ClaimsSection';
import { SmoothScroll } from '@/features/landing/SmoothScroll';

import { fetchFeedIndex } from '@/lib/api/feedServer';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { isInternshipOpportunity } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/feedCache.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.

const LANDING_TITLE = SITE_TITLE;
const LANDING_DESCRIPTION =
    'Off campus jobs, internships and walk in drives for freshers in India — shared by the community, linked straight to official pages.';

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
    const feed = await fetchFeedIndex();
    const opps = feed?.opportunities ?? [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Per-type counts (same groupings as the old single-enum `type` checks,
    // expressed in the independent taxonomy dimensions).
    const jobs = opps.filter((o) => {
        const isIntern = isInternshipOpportunity(o);
        const isGov = o.sector === 'GOVERNMENT' || (o as any).governmentJobDetails;
        const isWalkin = o.recruitmentMethod === 'WALK_IN' || (o as any).walkInDetails || (o as any).driveDetails || (o as any).walkin || (o.recruitmentMethod === 'OFF_CAMPUS') || (o.recruitmentMethod === 'ON_CAMPUS') || (o.recruitmentMethod === 'POOL_CAMPUS');
        if (isIntern || isGov || isWalkin) return false;
        return true;
    }).length;
    const internships = opps.filter((o) => isInternshipOpportunity(o)).length;
    const walkins = opps.filter((o) => o.recruitmentMethod === 'WALK_IN' || (o as any).walkInDetails || (o as any).driveDetails || (o as any).walkin).length;
    const govt = opps.filter((o) => o.sector === 'GOVERNMENT' || (o as any).governmentJobDetails).length;

    // New today (posted since local midnight, capped by feed freshness)
    const newToday = opps.filter((o) => new Date(o.postedAt).getTime() >= startOfToday.getTime()).length;

    // The five most recent postings, for the board section below the fold.
    const latest = [...opps]
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
        .slice(0, 5)
        .map(toOpportunityCardDTO);

    return (
        <>
            <SmoothScroll />
            {/* No Organization JSON-LD here: the root layout already emits one from
                <head>, and this block duplicated it with a conflicting shape. */}

            <HeroSection newToday={newToday} total={opps.length} />
            <LiveBoard counts={{ jobs, internships, walkins, govt }} latest={latest} />
            <TaglineReveal />
            <ClaimsSection />
        </>
    );
}
