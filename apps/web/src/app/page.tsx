import type { Metadata } from 'next';
import { fetchBootstrapFeed, fetchEducationMetadata, fetchSkillsMetadata, EducationMetadata } from '@/lib/api/cdnFeed';
import dynamic from 'next/dynamic';
const EligibilityMatcher = dynamic(() => import('@/features/landing/EligibilityMatcher').then(m => m.EligibilityMatcher));
import { HeroSection } from '@/features/landing/HeroSection';
const CorporateCollections = dynamic(() => import('@/features/landing/CorporateCollections').then(m => m.CorporateCollections));
const ExamCategories = dynamic(() => import('@/features/landing/ExamCategories').then(m => m.ExamCategories));
const GovtNoticeBoard = dynamic(() => import('@/features/landing/GovtNoticeBoard').then(m => m.GovtNoticeBoard));
const FinalCTA = dynamic(() => import('@/features/landing/FinalCTA').then(m => m.FinalCTA));
import { RecentOpportunities } from '@/features/landing/RecentOpportunities';
import type { Opportunity } from '@fresherflow/types';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

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
    // ZERO-BLOCKING STRATEGY:
    // Race data fetching against a 500ms timeout so a slow CDN never
    // causes a "circling" hang — we render with defaults instead.
    let liveCount = 207;
    let opportunities: Opportunity[] = [];
    let educationMetadata: EducationMetadata | null = null;
    let skillsMetadata: string[] | null = null;

    try {
        const dataPromise = Promise.all([
            fetchBootstrapFeed(),
            fetchEducationMetadata(),
            fetchSkillsMetadata(),
        ]);

        const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
        const timeoutMs = isBuild ? 15000 : 500;
        const timeoutPromise = new Promise<[null, null, null]>((resolve) =>
            setTimeout(() => resolve([null, null, null]), timeoutMs)
        );

        const [resolvedFeed, resolvedEdu, resolvedSkills] = await Promise.race([dataPromise, timeoutPromise]);
        if (resolvedFeed) {
            opportunities = resolvedFeed.opportunities || [];
            liveCount = resolvedFeed.count || opportunities.length || 207;
        }
        educationMetadata = resolvedEdu;
        skillsMetadata = resolvedSkills;
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
                    <HeroSection liveCount={liveCount} opportunities={opportunities} />

                    {/* Eligibility Matcher — temporarily hidden until feature is ready */}
                    {false && (
                        <section className="hidden md:block py-10 md:py-14 px-6 border-t border-border/40">
                            <div className="max-w-6xl mx-auto space-y-10">
                                <div className="max-w-2xl mx-auto text-center space-y-3">
                                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                        Check eligibility instantly.
                                    </h2>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Stop reading endless text blocks to check if your graduation year or degree qualifies. Instantly check if you are eligible based on your batch, degree, and skills.
                                    </p>
                                </div>
                                <EligibilityMatcher
                                    opportunities={opportunities}
                                    educationMetadata={educationMetadata || undefined}
                                    skillsMetadata={skillsMetadata || undefined}
                                />
                            </div>
                        </section>
                    )}

                    <RecentOpportunities opportunities={opportunities} />
                    <CorporateCollections />
                    <ExamCategories />
                    <GovtNoticeBoard opportunities={opportunities} />
                    <FinalCTA />
                </main>
            </div>
        </>
    );
}
