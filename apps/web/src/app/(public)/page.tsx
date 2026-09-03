import type { Metadata } from 'next';
import { fetchFeedIndex, fetchGovernmentFeed } from '@/lib/api/cdnFeed';
import dynamic from 'next/dynamic';
import { HeroSection } from '@/features/landing/HeroSection';
import type { Opportunity } from '@fresherflow/types';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

// Lazy-load below-the-fold sections so the heavy JobCard chain (Firebase + location
// taxonomy) never delays above-the-fold LCP. Skeletons preserve layout with no CLS.
const RecentOpportunities = dynamic(
    () => import('@/features/landing/RecentOpportunities').then(m => m.RecentOpportunities),
    { loading: () => <div className="py-10 md:py-14 px-6 border-t border-border/40"><div className="max-w-6xl mx-auto space-y-7"><div className="h-4 w-40 bg-muted/50 rounded animate-pulse" /><div className="h-8 w-64 bg-muted/40 rounded animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-8">{[1,2,3,4].map(i => <div key={i} className="h-44 bg-muted/30 rounded-2xl animate-pulse" />)}</div></div></div> }
);

// Dynamic imports with instant loading skeletons — no blank flash
const CorporateCollections = dynamic(
    () => import('@/features/landing/CorporateCollections').then(m => m.CorporateCollections),
    { loading: () => <div className="py-16 px-6"><div className="max-w-6xl mx-auto space-y-8"><div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" /><div className="h-4 w-80 bg-muted/40 rounded animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">{[1,2,3].map(i => <div key={i} className="h-40 bg-muted/30 rounded-2xl animate-pulse" />)}</div></div></div> }
);
const ExamCategories = dynamic(
    () => import('@/features/landing/ExamCategories').then(m => m.ExamCategories),
    { loading: () => <div className="py-14 px-6"><div className="max-w-6xl mx-auto"><div className="h-6 w-40 bg-muted/50 rounded-lg animate-pulse mx-auto" /><div className="flex flex-wrap justify-center gap-4 mt-8">{[1,2,3].map(i => <div key={i} className="h-16 w-64 bg-muted/30 rounded-xl animate-pulse" />)}</div></div></div> }
);
const GovtNoticeBoard = dynamic(
    () => import('@/features/landing/GovtNoticeBoard').then(m => m.GovtNoticeBoard),
    { loading: () => <div className="py-14 px-6"><div className="max-w-7xl mx-auto"><div className="h-6 w-52 bg-muted/50 rounded-lg animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse" />)}</div></div></div> }
);
const FinalCTA = dynamic(
    () => import('@/features/landing/FinalCTA').then(m => m.FinalCTA),
    { loading: () => null }
);

export const metadata: Metadata = {
    title: {
        absolute: 'FresherFlow - Verified Fresher Jobs & Internships in India',
    },
    description: 'Discover manually verified off-campus jobs, internships, and walk-ins for freshers across India. No fake listings. Direct official apply links.',
    keywords: ['verified off campus jobs', 'fresher jobs', 'internships', 'walk-ins', 'off campus drives', 'entry level jobs'],
    alternates: {
        canonical: '/',
    },
    openGraph: {
        siteName: 'FresherFlow',
        title: 'FresherFlow - Verified Fresher Jobs & Internships in India',
        description: 'Discover manually verified off-campus jobs, internships, and walk-ins for freshers across India. No fake listings. Direct official apply links.',
        type: 'website',
        images: [
            {
                url: '/opengraph-image',
                width: 1200,
                height: 630,
                alt: 'FresherFlow - Verified Fresher Jobs and Internships',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FresherFlow - Verified Fresher Jobs & Internships in India',
        description: 'Discover manually verified off-campus jobs, internships, and walk-ins for freshers across India. No fake listings. Direct official apply links.',
        images: ['/twitter-image'],
    },
};

// on-demand only — busted via revalidateTag on publish
export const revalidate = false;

export default async function LandingPage() {

    let liveCount = 0;
    let companiesCount = 0;
    let recentOps: Opportunity[] = [];
    let govtOps: Opportunity[] = [];

    try {
        const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
        const timeoutMs = isBuild ? 15000 : 200; // 200ms max — render fast with defaults
        const timeoutPromise = new Promise<any>((resolve) =>
            setTimeout(() => resolve(null), timeoutMs)
        );

        // Fetch index (lightweight) + govt feed in parallel
        const [resolvedJobsFeed, resolvedGovtFeed] = await Promise.all([
            Promise.race([fetchFeedIndex(), timeoutPromise]),
            Promise.race([fetchGovernmentFeed(), timeoutPromise]),
        ]);

        if (resolvedJobsFeed) {
            const rawOps = resolvedJobsFeed.opportunities || [];
            liveCount = resolvedJobsFeed.count || rawOps.length || 0;
            companiesCount = rawOps.length > 0
                ? new Set(rawOps.map((o: Opportunity) => o.company).filter(Boolean)).size
                : 0;
            
            recentOps = rawOps.slice(0, 4);
        }

        if (resolvedGovtFeed) {
            govtOps = (resolvedGovtFeed.opportunities || []) as unknown as Opportunity[];
        }
    } catch (err) {
        console.error('[Landing] Critical data resolution failure:', err);
    }

    const organizationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'FresherFlow',
        ...(SITE_URL ? { url: SITE_URL, logo: `${SITE_URL}/fresherflow-logo-v2.png` } : {}),
        description: 'Discover manually verified off-campus jobs, internships, and walk-ins for freshers across India. No fake listings. Direct official apply links.',
        sameAs: [
            'https://x.com/fresherflowin',
            'https://linkedin.com/company/fresherflow'
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 relative overflow-hidden">
                <main className="flex-1 flex flex-col relative z-10">
                    <HeroSection liveCount={liveCount} companiesCount={companiesCount} />

                    <RecentOpportunities opportunities={recentOps} />
                    <CorporateCollections />
                    <ExamCategories />
                    <GovtNoticeBoard opportunities={govtOps} />
                    <FinalCTA />
                </main>
            </div>
        </>
    );
}
