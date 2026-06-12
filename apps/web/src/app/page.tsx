import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { fetchBootstrapFeed, fetchEducationMetadata, fetchSkillsMetadata, EducationMetadata } from '@/lib/api/cdnFeed';
import { EligibilityMatcher } from '@/features/landing/EligibilityMatcher';
import { LandingStats } from '@/features/landing/LandingStats';
import { Opportunity } from '@fresherflow/types';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import KeyIcon from '@heroicons/react/24/outline/KeyIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CpuChipIcon from '@heroicons/react/24/outline/CpuChipIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import { cn } from '@repo/ui/utils/cn';

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

const PHASE_GROUPS = [
    { key: 'APPLY_NOW',  label: 'Latest Govt Jobs',    Icon: CheckCircleIcon,    urgency: 'high',   statuses: ['OPEN'] },
    { key: 'ADMIT_CARD', label: 'Admit Card Out',      Icon: IdentificationIcon, urgency: 'high',   statuses: ['ADMIT_CARD_RELEASED'] },
    { key: 'RESULT',     label: 'Result Declared',     Icon: TrophyIcon,         urgency: 'medium', statuses: ['RESULT_DECLARED'] },
    { key: 'ANSWER_KEY', label: 'Answer Keys',         Icon: KeyIcon,            urgency: 'normal', statuses: ['ANSWER_KEY_RELEASED'] },
];

const EXAM_CATEGORIES = [
    { title: 'Banking & Insurance', icon: BuildingLibraryIcon, href: '/government-jobs?category=Banking', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'SSC & Railway Exams', icon: TrophyIcon, href: '/government-jobs?category=SSC', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Teaching & UGC', icon: AcademicCapIcon, href: '/government-jobs?category=Teaching', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'State Level Exams', icon: MapPinIcon, href: '/government-jobs?category=State', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { title: 'Engineering & ITI', icon: CpuChipIcon, href: '/government-jobs?category=Engineering', color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

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
                                <LandingStats 
                                    initialLiveCount={liveCount} 
                                    initialCompaniesCount={new Set(opportunities.map(o => o.company).filter(Boolean)).size} 
                                />
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



                    {/* Pillar 2: Smart Fit Dynamic Sandbox (Temporarily Hidden) */}
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

                    {/* Pillar 3: Trust ledger */}
                    <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/10">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.45fr_1fr] gap-10 items-start">
                            <div className="flex flex-col h-full">
                                <div className="space-y-4">
                                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                                        Built for a better job search.
                                    </h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Most job boards are flooded with expired postings, affiliate redirects, and fake company profiles. We built FresherFlow to give students a reliable, clean, and direct application experience.
                                    </p>
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-border/60 space-y-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/20">
                                        <DevicePhoneMobileIcon className="w-4 h-4" />
                                        Native Mobile Experience
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-extrabold tracking-tight">Available on Android</h3>
                                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm">
                                            Get the full experience with our Android app. Featuring zero-latency feeds, immediate offline saves, and instant push notifications.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <Link href="/download" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors">
                                            Download APK
                                        </Link>
                                    </div>
                                </div>
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

                    {/* Explore by Exams - Govt Categories */}
                    <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/5">
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="text-center space-y-2 max-w-2xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                    Explore by Exams
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Find verified notifications and updates for top Government exams in India.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4">
                                {EXAM_CATEGORIES.map((cat) => (
                                    <Link key={cat.title} href={cat.href} className="flex items-center gap-3 bg-card border border-border/80 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm rounded-xl p-4 w-full sm:w-[280px] transition-all group">
                                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", cat.bg)}>
                                            <cat.icon className={cn("w-6 h-6", cat.color)} />
                                        </div>
                                        <div className="flex-1 font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                                            {cat.title}
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Latest Govt Updates Notice Board */}
                    {opportunities.length > 0 && (
                        <section className="py-10 md:py-14 px-6 border-t border-border/40">
                            <div className="max-w-7xl mx-auto space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                        Latest Govt Updates
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        Real-time tracking of Admit Cards, Results, and New Job Notifications.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-start">
                                    {PHASE_GROUPS.map(group => {
                                        // Filter opportunities for this phase group
                                        const groupOpps = opportunities.filter(o => {
                                            const s = (o.governmentJobDetails as any)?.applicationStatus;
                                            return s && group.statuses.includes(s);
                                        });
                                        if (groupOpps.length === 0) return null;
                                        return (
                                            <div key={group.key} className="flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                                                <div className={cn(
                                                    "px-4 py-3 border-b flex items-center gap-2",
                                                    group.urgency === 'high' ? 'bg-destructive/10 border-destructive/20' :
                                                    group.urgency === 'medium' ? 'bg-amber-500/10 border-amber-500/20' :
                                                    'bg-muted/50 border-border'
                                                )}>
                                                    <group.Icon className={cn(
                                                        "w-5 h-5",
                                                        group.urgency === 'high' ? 'text-destructive' :
                                                        group.urgency === 'medium' ? 'text-amber-600' :
                                                        'text-foreground'
                                                    )} />
                                                    <h3 className="text-sm font-extrabold uppercase tracking-widest flex-1">
                                                        {group.label}
                                                    </h3>
                                                </div>
                                                <div className="flex-1 p-2">
                                                    <ul className="space-y-1">
                                                        {groupOpps.slice(0, 10).map((opp: any) => {
                                                            const isNew = opp.createdAt && (Date.now() - new Date(opp.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000);
                                                            return (
                                                                <li key={opp.id}>
                                                                    <Link
                                                                        href={`/${opp.slug}`}
                                                                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs font-semibold leading-tight group/link"
                                                                    >
                                                                        <ChevronRightIcon className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground group-hover/link:text-primary" />
                                                                        <span className="group-hover/link:text-primary transition-colors line-clamp-2">
                                                                            {opp.title}
                                                                            {isNew && (
                                                                                <span className="inline-block ml-2 text-[9px] font-extrabold text-destructive animate-pulse uppercase">
                                                                                    New
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </Link>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                                {groupOpps.length > 10 && (
                                                    <Link
                                                        href="/government"
                                                        className="block p-3 text-xs font-bold text-center text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border/50"
                                                    >
                                                        View All Updates
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Corporate Collections */}
                    <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/10">
                        <div className="max-w-6xl mx-auto space-y-10">
                            <div className="text-center space-y-3 max-w-2xl mx-auto">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                    Private Sector
                                </span>
                                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                    Corporate Jobs & Internships
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
