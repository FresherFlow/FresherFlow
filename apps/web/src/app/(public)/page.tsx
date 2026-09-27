import type { Metadata } from 'next';
import { HeroSection } from '@/features/landing/HeroSection';
import { StatBand } from '@/features/landing/StatBand';
import { BoardsSection } from '@/features/landing/BoardsSection';
// Hidden for now — the comparison block claims things we don't do yet.
// import { ComparisonSection } from '@/features/landing/ComparisonSection';
import { ProofSection } from '@/features/landing/ProofSection';
import { CompanyRegister } from '@/features/landing/CompanyRegister';
import { StatementBand } from '@/features/landing/StatementBand';
import { SmoothScroll } from '@/features/landing/SmoothScroll';
import { LandingMarquee } from '@/features/landing/LandingMarquee';
import { fetchFeedIndex, fetchCompaniesMetadata } from '@/lib/api/cdnFeed';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { matchesFeedType } from '@/features/jobs/utils/walkinMapUtils';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

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

const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FresherFlow',
    ...(SITE_URL ? { url: SITE_URL, logo: `${SITE_URL}/fresherflow-logo-v2.png` } : {}),
    description: LANDING_DESCRIPTION,
    sameAs: ['https://x.com/fresherflowin', 'https://linkedin.com/company/fresherflow'],
};

const MS_PER_DAY = 86_400_000;

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


    // 7-day posting pulse: oldest → today
    const perDay = Array.from({ length: 7 }, (_, i) => {
        const dayStart = startOfToday.getTime() - (6 - i) * MS_PER_DAY;
        const dayEnd = dayStart + MS_PER_DAY;
        return opps.filter((o) => {
            const t = new Date(o.postedAt).getTime();
            return t >= dayStart && t < dayEnd;
        }).length;
    });

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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
            <LandingMarquee newToday={newToday} refreshedAt={refreshedAt} walkins={walkins} />
            <HeroSection newToday={newToday} refreshedAt={refreshedAt} discussHref={discussHref} />
            <StatBand data={{ total: opps.length, internships, walkins, companies: companyCounts.size }} />
            <BoardsSection data={{ jobs, internships, walkins, govt }} />
            <ProofSection perDay={perDay} latest={latest} />
            <CompanyRegister companies={companyRows} />
            <StatementBand />
        </>
    );
}
