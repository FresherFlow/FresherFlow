import type { Metadata } from 'next';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { getSiteMode } from '@/lib/siteModeServer';
import { GovtLandingPage } from '@/features/landing/GovtLandingPage';
import { fetchBootstrapFeed, fetchEducationMetadata, fetchSkillsMetadata, EducationMetadata } from '@/lib/api/cdnFeed';
import { SiteMode } from '@/lib/siteMode';

import { EligibilityMatcher } from '@/features/landing/EligibilityMatcher';
import { Opportunity } from '@fresherflow/types';

export const metadata: Metadata = {
    title: 'FresherFlow - Verified Fresher Jobs & Internships in India',
    description: 'Verified fresher jobs, internships, and walk-ins in India. Every listing is checked. Every link is real.',
    keywords: ['verified off campus jobs', 'fresher jobs', 'internships', 'walk-ins', 'off campus drives', 'entry level jobs'],
    openGraph: {
        siteName: 'FresherFlow',
        title: 'FresherFlow - Verified Fresher Jobs & Internships in India',
        description: 'Verified fresher jobs, internships, and walk-ins in India. Every listing is checked. Every link is real.',
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
        description: 'Verified fresher jobs, internships, and walk-ins in India. Every listing is checked. Every link is real.',
        images: ['/twitter-image'],
    },
};

// Revalidate once per day so the count stays reasonably fresh
export const revalidate = 86400;



export default async function LandingPage() {
    // eslint-disable-next-line react-hooks/purity
    const start = Date.now();
    
    // ZERO-BLOCKING STRATEGY:
    // We race the data fetching against a 500ms timeout.
    // If the data takes longer than 500ms, we render with defaults to stop the "circling" hang.
    let liveCount = 0;
    let mode: SiteMode = 'private';
    let opportunities: Opportunity[] = [];
    let educationMetadata: EducationMetadata | null = null;
    let skillsMetadata: string[] | null = null;

    try {
        const feedPromise = fetchBootstrapFeed();
        const modePromise = getSiteMode();
        const eduPromise = fetchEducationMetadata();
        const skillsPromise = fetchSkillsMetadata();

        const dataPromise = Promise.all([
            feedPromise,
            modePromise,
            eduPromise,
            skillsPromise
        ]);

        const timeoutPromise = new Promise<[null, SiteMode, null, null]>((resolve) =>
            setTimeout(() => resolve([null, 'private', null, null]), 500)
        );

        const [resolvedFeed, resolvedMode, resolvedEdu, resolvedSkills] = await Promise.race([dataPromise, timeoutPromise]);
        mode = resolvedMode;
        if (resolvedFeed) {
            opportunities = resolvedFeed.opportunities || [];
            liveCount = resolvedFeed.count || opportunities.length || 0;
        }
        educationMetadata = resolvedEdu;
        skillsMetadata = resolvedSkills;
    } catch (err) {
        console.error('[Landing] Critical data resolution failure:', err);
    }
    
    // eslint-disable-next-line react-hooks/purity
    console.log(`[Landing] Page data resolved in ${Date.now() - start}ms (mode: ${mode}, count: ${liveCount}, opportunities: ${opportunities.length})`);

    if (mode === 'govt') {
        return <GovtLandingPage liveCount={liveCount} />;
    }

    const countLabel = liveCount > 0 ? `${liveCount}+` : 'Daily';
    return (
        <>
            <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 relative overflow-hidden">
                <main className="flex-1 flex flex-col relative z-10">

                    {/* Hero Section */}
                    <section className="relative pt-16 pb-20 md:pt-28 md:pb-28 px-6">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur shadow-sm">
                                    <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Flow Protocol Live & Verified
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                                    The verified career feed for graduates.
                                </h1>
                                <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                                    Before you apply, we verify. FresherFlow replaces noisy job boards with a clean, 100% verified stream of off-campus jobs, internships, and walk-ins. Checked by hand, proven by logic.
                                </p>
                                
                                {/* Mobile-only Image (Option 2 placement: Main Text -> Image -> Buttons -> Cards) */}
                                <div className="block lg:hidden relative rounded-2xl overflow-hidden shadow-md border border-border bg-card/40 backdrop-blur p-1.5 transition-all duration-300">
                                    <img 
                                        alt="FresherFlow Interface Demonstration Mobile"
                                        className="w-full h-[200px] object-cover rounded-xl grayscale-[0.05]"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3tZJKvyI6tc96EkTndqlfFMEk4KqIdS2q0HKEDeAG3JExuSOyfTY_Df5ThvVRWlpwTfFeK5PPFA-gNhJvDGD80MbMvIMKAq_dvMc5ERdu9GFzynplovygxGg1Jwvaw89hUjtQa-ooCRA5soLZa3Cykp41b3AI7AgTKbPaTIupk13KMl_EGzcWZQfmIQ4UutVy278nvm7hKh4UHSgju6JmA0PDUT57o91tGcwYAao2dirY_UmttpRATIhoaTrbr_fDhalmVNfoAkv-" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3.5 pt-2">
                                    <Link href="/opportunities" className="premium-button w-full sm:w-auto px-7 py-3 text-[12px] uppercase tracking-widest shadow-md text-center justify-center flex items-center">
                                        Open Feed
                                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                                    </Link>
                                    <Link href="/download" className="premium-button-outline w-full sm:w-auto px-7 py-3 text-[12px] uppercase tracking-widest shadow-sm text-center justify-center flex items-center">
                                        Get App
                                    </Link>
                                </div>
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-6">
                                    {[
                                        { label: 'Links Checked', value: '100%' },
                                        { label: 'Verified Roles', value: countLabel },
                                        { label: 'Spam Filtered', value: '100%' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="rounded-xl sm:rounded-2xl border border-border bg-card/65 backdrop-blur p-2.5 sm:p-4.5 shadow-sm text-center flex flex-col justify-center">
                                          <div className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</div>
                                          <div className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5 sm:mt-1 truncate">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="hidden lg:block relative rounded-3xl overflow-hidden shadow-xl border border-border bg-card/40 backdrop-blur p-2 group transition-all duration-500 hover:border-primary/20">
                                <img 
                                    alt="FresherFlow Interface Demonstration"
                                    className="w-full h-[240px] sm:h-[320px] md:h-[480px] object-cover rounded-2xl grayscale-[0.05] transition-transform duration-700 group-hover:scale-[1.02]"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3tZJKvyI6tc96EkTndqlfFMEk4KqIdS2q0HKEDeAG3JExuSOyfTY_Df5ThvVRWlpwTfFeK5PPFA-gNhJvDGD80MbMvIMKAq_dvMc5ERdu9GFzynplovygxGg1Jwvaw89hUjtQa-ooCRA5soLZa3Cykp41b3AI7AgTKbPaTIupk13KMl_EGzcWZQfmIQ4UutVy278nvm7hKh4UHSgju6JmA0PDUT57o91tGcwYAao2dirY_UmttpRATIhoaTrbr_fDhalmVNfoAkv-" 
                                />
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-size-[48px_48px] -z-10" />
                    </section>



                    {/* Pillar 2: Smart Fit Dynamic Sandbox */}
                    <section className="hidden md:block py-14 md:py-20 px-6 border-t border-border/40">
                        <div className="max-w-6xl mx-auto space-y-10">
                            <div className="max-w-2xl mx-auto text-center space-y-3">
                                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                    Instant eligibility verification.
                                </h2>
                                <p className="text-sm md:text-base text-muted-foreground">
                                    Stop reading endless text blocks to check if your graduation year or degree qualifies. The Smart Fit Engine calculates your suitability in real-time.
                                </p>
                            </div>
                            <EligibilityMatcher 
                                opportunities={opportunities} 
                                educationMetadata={educationMetadata || undefined}
                                skillsMetadata={skillsMetadata || undefined}
                            />
                        </div>
                    </section>

                    {/* Pillar 3: Trust ledger */}
                    <section className="py-14 md:py-20 px-6 border-t border-border/40 bg-muted/10">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.45fr_1fr] gap-10 items-start">
                            <div className="space-y-4">
                                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                                    Pristine redirection integrity.
                                </h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    No intermediate tracking networks, no affiliate redirects, and no ad blocks. We route you directly to verified applicant tracking systems (Greenhouse, Workday, Lever) or official careers.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Verified Links', text: 'Daily crawler checkups prevent dead redirect or 404 links.' },
                                    { title: 'Deduplicated Feeds', text: 'Smart clustering algorithm joins matching multi-source postings.' },
                                    { title: 'Direct to ATS', text: 'Routes to official application portals without middle-man routing.' },
                                    { title: 'Expiry Auditing', text: 'Opportunities automatically archive the minute the deadline is met.' },
                                ].map((item) => (
                                    <div key={item.title} className="premium-card p-5 space-y-2 border border-border/80 bg-card/65 shadow-sm">
                                        <h3 className="text-sm md:text-base font-bold text-foreground tracking-tight">{item.title}</h3>
                                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Curated Story-Driven Collections */}
                    <section className="py-14 md:py-20 px-6 border-t border-border/40">
                        <div className="max-w-6xl mx-auto space-y-10">
                            <div className="text-center space-y-3 max-w-2xl mx-auto">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                    Curated Feeds
                                </span>
                                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                    Wander into tailored collections.
                                </h2>
                                <p className="text-muted-foreground text-sm md:text-base">
                                    We group opportunities by style and energy, not just generic parameters.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { title: 'Verified Off-Campus Jobs', desc: 'Full-time graduate engineer programs and entry roles with clear package visibility.', href: '/jobs' },
                                    { title: 'Early Career Internships', desc: 'Paid off-cycle, summer, and winter internships with direct team matching.', href: '/internships' },
                                    { title: 'Walk-In Recruitment Drives', desc: 'Direct on-site interview schedules with verified physical venues and contact coordinates.', href: '/walk-ins' },
                                ].map((item) => (
                                    <Link key={item.title} href={item.href} className="group premium-card p-6 space-y-4 hover:border-primary/30 hover:-translate-y-1 shadow-sm transition-all duration-300 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary mt-2">
                                            Explore Feed
                                            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Final Premium CTA Card */}
                    <section className="py-20 px-6 border-t border-border/40 bg-muted/5">
                        <div className="max-w-5xl mx-auto text-center space-y-8 rounded-3xl border border-border bg-card/60 backdrop-blur-md p-10 md:p-14 shadow-xl relative overflow-hidden">
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                Stop searching. Start applying.
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                                Join thousands of students getting fast, direct redirection to authentic, manual-checked tech openings.
                            </p>
                            <div className="flex justify-center pt-2">
                                <Link href="/download" className="premium-button px-9 text-[12px] uppercase tracking-widest shadow-md">
                                    Download App
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
