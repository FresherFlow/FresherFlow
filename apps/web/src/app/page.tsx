import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { fetchBootstrapFeed, fetchEducationMetadata, fetchSkillsMetadata, EducationMetadata } from '@/lib/api/cdnFeed';
import { redirect } from 'next/navigation';

import { EligibilityMatcher } from '@/features/landing/EligibilityMatcher';
import { Opportunity } from '@fresherflow/types';

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

// Revalidate once per day so the count stays reasonably fresh
export const revalidate = false; // on-demand only — busted via revalidateTag on publish



export default async function LandingPage() {


    // ZERO-BLOCKING STRATEGY:
    // We race the data fetching against a 500ms timeout.
    // If the data takes longer than 500ms, we render with defaults to stop the "circling" hang.
    let liveCount = 0;
    let opportunities: Opportunity[] = [];
    let educationMetadata: EducationMetadata | null = null;
    let skillsMetadata: string[] | null = null;

    try {
        const feedPromise = fetchBootstrapFeed();
        const eduPromise = fetchEducationMetadata();
        const skillsPromise = fetchSkillsMetadata();

        const dataPromise = Promise.all([
            feedPromise,
            eduPromise,
            skillsPromise
        ]);

        const timeoutPromise = new Promise<[null, null, null]>((resolve) =>
            setTimeout(() => resolve([null, null, null]), 500)
        );

        const [resolvedFeed, resolvedEdu, resolvedSkills] = await Promise.race([dataPromise, timeoutPromise]);
        if (resolvedFeed) {
            opportunities = resolvedFeed.opportunities || [];
            liveCount = resolvedFeed.count || opportunities.length || 0;
        }
        educationMetadata = resolvedEdu;
        skillsMetadata = resolvedSkills;
    } catch (err) {
        console.error('[Landing] Critical data resolution failure:', err);
    }
    





    return (
        <>
            <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 relative overflow-hidden">
                <main className="flex-1 flex flex-col relative z-10">

                    {/* Hero Section */}
                    <section className="relative min-h-[calc(100vh-3.75rem)] md:min-h-[calc(100vh-4.75rem)] flex items-center justify-center pt-8 pb-12 md:py-16 px-6">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center w-full">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/65 backdrop-blur shadow-sm">
                                    <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Every Job Verified Before You Apply
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                                    Verified Off-Campus Jobs & Internships.
                                </h1>
                                <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                                    Your first job search should be easy, clean, and honest. We find and check every job and internship directly from official company websites, giving you direct apply links without any spam, ads, or fake listings.
                                </p>
                                
                                <div className="block lg:hidden relative rounded-2xl overflow-hidden shadow-md border border-border bg-card/40 backdrop-blur p-1.5 transition-all duration-300 w-full h-[200px]">
                                    <Image 
                                        alt="FresherFlow Interface Demonstration Mobile"
                                        className="object-cover rounded-xl grayscale-[0.05]"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3tZJKvyI6tc96EkTndqlfFMEk4KqIdS2q0HKEDeAG3JExuSOyfTY_Df5ThvVRWlpwTfFeK5PPFA-gNhJvDGD80MbMvIMKAq_dvMc5ERdu9GFzynplovygxGg1Jwvaw89hUjtQa-ooCRA5soLZa3Cykp41b3AI7AgTKbPaTIupk13KMl_EGzcWZQfmIQ4UutVy278nvm7hKh4UHSgju6JmA0PDUT57o91tGcwYAao2dirY_UmttpRATIhoaTrbr_fDhalmVNfoAkv-" 
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3.5 pt-2">
                                    <Link href="/opportunities" className="premium-button w-full sm:w-auto px-7 py-3 text-[12px] uppercase tracking-widest shadow-md text-center justify-center flex items-center">
                                        Open Feed
                                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                                    </Link>
                                    <Link href="/app" className="premium-button-outline w-full sm:w-auto px-7 py-3 text-[12px] uppercase tracking-widest shadow-sm text-center justify-center flex items-center">
                                        Get App
                                    </Link>
                                </div>
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-6">
                                    {[
                                        { label: 'Verified Apply Links', value: 'Manual' },
                                        { label: 'Opportunities Updated', value: 'Daily' },
                                        { label: 'Fake Listings', value: 'Filtered' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="rounded-xl sm:rounded-2xl border border-border bg-card/65 backdrop-blur p-2.5 sm:p-4.5 shadow-sm text-center flex flex-col justify-center">
                                          <div className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</div>
                                          <div className="text-[8px] sm:text-[10px] uppercase tracking-wide sm:tracking-widest text-muted-foreground font-bold mt-0.5 sm:mt-1 leading-tight text-center">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             <div className="hidden lg:block relative rounded-3xl overflow-hidden shadow-xl border border-border bg-card/40 backdrop-blur p-2 group transition-all duration-500 hover:border-primary/20 w-full h-[480px]">
                                <Image 
                                    alt="FresherFlow Interface Demonstration"
                                    className="object-cover rounded-2xl grayscale-[0.05] transition-transform duration-700 group-hover:scale-[1.02]"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3tZJKvyI6tc96EkTndqlfFMEk4KqIdS2q0HKEDeAG3JExuSOyfTY_Df5ThvVRWlpwTfFeK5PPFA-gNhJvDGD80MbMvIMKAq_dvMc5ERdu9GFzynplovygxGg1Jwvaw89hUjtQa-ooCRA5soLZa3Cykp41b3AI7AgTKbPaTIupk13KMl_EGzcWZQfmIQ4UutVy278nvm7hKh4UHSgju6JmA0PDUT57o91tGcwYAao2dirY_UmttpRATIhoaTrbr_fDhalmVNfoAkv-" 
                                    fill
                                    sizes="(max-width: 1024px) 100vw, (max-width: 1200px) 50vw, 600px"
                                    priority
                                />
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-size-[48px_48px] -z-10" />
                    </section>



                    {/* Pillar 2: Smart Fit Dynamic Sandbox */}
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

                    {/* Pillar 3: Trust ledger */}
                    <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/10">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.45fr_1fr] gap-10 items-start">
                            <div className="space-y-4">
                                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                                    Built for a better job search.
                                </h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Most job boards are flooded with expired postings, affiliate redirects, and fake company profiles. We built FresherFlow to give students a reliable, clean, and direct application experience.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Direct to Official Apply', text: 'Skip ad shorteners, middlemen, and tracking links. Apply directly on official Greenhouse, Lever, or company career portals.' },
                                    { title: 'Works on Weak Networks', text: 'No infinite loading spinners. The app is optimized to load feeds instantly and work even on spotty college Wi-Fi.' },
                                    { title: 'Offline Saves & Reminders', text: 'Save interesting roles for offline access immediately and apply later when you have time, without losing track.' },
                                    { title: 'Deadline Monitoring', text: 'Active tracking of application deadlines. Expired listings are removed automatically, so you do not waste time on dead roles.' },
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
                    <section className="py-10 md:py-14 px-6 border-t border-border/40">
                        <div className="max-w-6xl mx-auto space-y-10">
                            <div className="text-center space-y-3 max-w-2xl mx-auto">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                    Browse Opportunities
                                </span>
                                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                    Find jobs by category.
                                </h2>
                                <p className="text-muted-foreground text-sm md:text-base">
                                    Verified opportunities grouped cleanly by career path to save you time.
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
                    <section className="py-14 px-6 border-t border-border/40 bg-muted/5">
                        <div className="max-w-5xl mx-auto text-center space-y-8 rounded-3xl border border-border bg-card/60 backdrop-blur-md p-10 md:p-14 shadow-xl relative overflow-hidden">
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                Stop searching. Start applying.
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                                Join thousands of students getting fast, direct redirection to authentic, manual-checked career openings.
                            </p>
                            <div className="flex justify-center pt-2">
                                <Link href="/app" className="premium-button px-9 text-[12px] uppercase tracking-widest shadow-md">
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
