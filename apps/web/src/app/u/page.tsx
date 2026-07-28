import type { Metadata } from 'next';
import Link from 'next/link';
import {
    CheckCircleIcon,
    ArrowRightIcon,
    CodeBracketIcon,
    AcademicCapIcon,
    RocketLaunchIcon,
    ShieldCheckIcon,
    BriefcaseIcon,
    MapPinIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
    title: 'FresherFlow /u/ — The Modern Candidate Portfolio for Freshers',
    description:
        'Create your verified, recruiter-ready public portfolio. Showcase your live project demos, GitHub docs, academic journey, and career preferences with one simple link.',
};

export default function PublicProfileBrandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
            {/* 1. HERO SECTION */}
            <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/60">
                {/* Radial Glow Signature */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    {/* Hero Text Content */}
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider shadow-2xs">
                            <RocketLaunchIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>The New Candidate Portfolio Standard</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                            One Link to Showcase Your{' '}
                            <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-8">
                                Skills, Projects
                            </span>{' '}
                            &amp; Academic Journey.
                        </h1>

                        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal max-w-2xl mx-auto">
                            Stop sending fragmented links and cluttered PDF resumes. FresherFlow gives you a verified,
                            recruiter-ready public profile with interactive project demos, git documentation, and structured
                            career availability—all at{' '}
                            <code className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-sm border border-border/60">
                                fresherflow.in/u/yourname
                            </code>
                            .
                        </p>

                        {/* Tactile Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Link
                                href="/join"
                                className="w-full sm:w-auto px-6 py-3.5 bg-primary text-primary-foreground font-bold text-sm md:text-base rounded-2xl shadow-lg hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out inline-flex items-center justify-center gap-2"
                            >
                                <span>Claim Your /u/ Username</span>
                                <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                            </Link>

                            <Link
                                href="/opportunities"
                                className="w-full sm:w-auto px-6 py-3.5 bg-card hover:bg-muted text-foreground font-bold text-sm md:text-base rounded-2xl border border-border/60 hover:border-border active:scale-[0.97] transition-all duration-150 ease-out inline-flex items-center justify-center gap-2 shadow-2xs"
                            >
                                <span>Explore Verified Jobs</span>
                            </Link>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />
                                <span>100% Free for Students &amp; Freshers</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />
                                <span>Recruiter-Verified Data Schema</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />
                                <span>Instant Resume &amp; LinkedIn Integration</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Glassmorphic Profile Preview Mockup */}
                    <div id="preview" className="pt-4">
                        <div className="max-w-5xl mx-auto rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden p-4 sm:p-6 md:p-8 space-y-6">
                            {/* Header Mockup */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-sm shrink-0">
                                        KS
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                                                Krish Sharma
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold">
                                                <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                                                Verified Market Ready
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                            Full-Stack TypeScript Engineer &amp; AI Product Builder
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                                            <span className="flex items-center gap-1 font-medium">
                                                <MapPinIcon className="w-3.5 h-3.5 text-primary" /> Bengaluru, India
                                            </span>
                                            <span className="flex items-center gap-1 text-primary font-bold">
                                                <ClockIcon className="w-3.5 h-3.5" /> Available Immediately
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <span className="px-3.5 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl border border-primary/20 inline-flex items-center gap-1.5 shadow-2xs">
                                        <span>fresherflow.in/u/krish-sharma</span>
                                    </span>
                                </div>
                            </div>

                            {/* 2-Column Responsive Dashboard Grid Mockup */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                {/* Left Column: Projects & Skills */}
                                <div className="md:col-span-8 space-y-4">
                                    {/* Projects Container */}
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <CodeBracketIcon className="w-4 h-4 text-primary" />
                                                Featured Projects (2)
                                            </h4>
                                            <span className="text-xs font-semibold text-primary">Live Demos Wired →</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="group bg-card border border-border/60 rounded-xl p-4 space-y-2.5 hover:border-border hover:shadow-md active:scale-[0.98] transition-all duration-150 ease-out cursor-default">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h5 className="font-bold text-sm text-foreground truncate">
                                                        AI Opportunity Scanner
                                                    </h5>
                                                    <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] shadow-2xs">
                                                        Live ↗
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    Real-time fresher job and walk-in opportunity discovery pipeline with BullMQ &amp; Redis.
                                                </p>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <span className="px-2 py-0.5 bg-muted text-foreground text-[10px] font-semibold rounded-md border border-border/40">
                                                        TypeScript
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-muted text-foreground text-[10px] font-semibold rounded-md border border-border/40">
                                                        Next.js 16
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="group bg-card border border-border/60 rounded-xl p-4 space-y-2.5 hover:border-border hover:shadow-md active:scale-[0.98] transition-all duration-150 ease-out cursor-default">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h5 className="font-bold text-sm text-foreground truncate">
                                                        FresherFlow Mobile App
                                                    </h5>
                                                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-bold text-[10px] border border-border/60">
                                                        Git Docs ↗
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    Universal React Native Expo mobile application with offline feed scoring and MMKV caching.
                                                </p>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <span className="px-2 py-0.5 bg-muted text-foreground text-[10px] font-semibold rounded-md border border-border/40">
                                                        Expo
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-muted text-foreground text-[10px] font-semibold rounded-md border border-border/40">
                                                        React Native
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skills Box */}
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Verified Technical Skills
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                'TypeScript',
                                                'JavaScript (ES6+)',
                                                'Next.js 16',
                                                'React Native',
                                                'Node.js',
                                                'PostgreSQL',
                                                'Prisma ORM',
                                                'Redis',
                                                'Tailwind CSS',
                                                'Git',
                                            ].map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="px-2.5 py-1 bg-card hover:bg-muted/60 text-foreground font-semibold text-xs rounded-xl border border-border/60 shadow-2xs transition-colors duration-150 ease-out"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Preferences & Academic Timeline */}
                                <div className="md:col-span-4 space-y-4">
                                    {/* Career Preferences */}
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <BriefcaseIcon className="w-4 h-4 text-primary" />
                                            Career Preferences
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    Target Opportunity Types
                                                </p>
                                                <p className="font-bold text-foreground pt-1">
                                                    Full-Time Job, Walk-In Interview
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    Preferred Work Mode
                                                </p>
                                                <p className="font-bold text-foreground pt-1">
                                                    Onsite, Hybrid, Remote
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Education Timeline Snippet */}
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <AcademicCapIcon className="w-4 h-4 text-primary" />
                                            Academic Journey
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center justify-between font-semibold">
                                                <span className="text-foreground font-bold">B.Tech in Computer Science</span>
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px] tabular-nums">2026</span>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] font-medium">
                                                Visvesvaraya Technological University
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. WHY RECRUITERS PREFER /u/ PROFILES */}
            <section id="features" className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                            Why Stand Out With FresherFlow
                        </h2>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                            Built For How Modern Engineering Teams Hire.
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground font-normal">
                            We removed the fluff from traditional resumes and created an interactive workspace profile
                            that highlights your real-world coding ability.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="group relative overflow-hidden bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs hover:border-border hover:shadow-lg active:scale-[0.98] transition-all duration-200 ease-out">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ease-out">
                                <CodeBracketIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Interactive Project Demos</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Don’t just list project names. Provide recruiters with 1-click access to your live web apps
                                and direct GitHub repository documentation without downloads.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group relative overflow-hidden bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs hover:border-border hover:shadow-lg active:scale-[0.98] transition-all duration-200 ease-out">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ease-out">
                                <BriefcaseIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Structured Career Preferences</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Let hiring managers instantly see whether you’re seeking a Full-Time Job, Internship, or
                                Walk-In Interview, along with your target cities and work modes.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group relative overflow-hidden bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs hover:border-border hover:shadow-lg active:scale-[0.98] transition-all duration-200 ease-out">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ease-out">
                                <AcademicCapIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Verified Academic Stepper</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Present your 10th, 12th, Undergraduate, and Postgraduate milestones in a clean, chronological
                                timeline that communicates your academic story in seconds.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. HOW IT WORKS STEPPER */}
            <section id="how-it-works" className="py-16 md:py-24 border-b border-border/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                            Quick Setup
                        </h2>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                            Your Public Profile Live in 3 Simple Steps.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {/* Step 1 */}
                        <div className="group p-6 md:p-8 rounded-2xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-150 ease-out tabular-nums">
                                01
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Claim Your /u/ Link</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Sign up for free and choose your custom username URL (e.g.,{' '}
                                <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border/40 text-foreground font-bold">fresherflow.in/u/yourname</code>
                                ).
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="group p-6 md:p-8 rounded-2xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-150 ease-out tabular-nums">
                                02
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Add Your Skills &amp; Projects</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Add your technical skills, pin your top GitHub repositories, and attach live demo URLs so
                                recruiters can test your work immediately.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="group p-6 md:p-8 rounded-2xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-150 ease-out tabular-nums">
                                03
                            </div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">Share Everywhere</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Paste your verified FresherFlow profile link on your resume, LinkedIn bio, and direct job
                                application forms to stand out from the crowd.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. USERNAME CTA BANNER */}
            <section className="py-16 md:py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Background subtle gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

                        <div className="space-y-2 relative z-10">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                                Claim Your Professional Username Today.
                            </h2>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                Join thousands of students and fresh graduates using FresherFlow to land verified
                                off-campus jobs and walk-in interviews.
                            </p>
                        </div>

                        <div className="pt-2 relative z-10">
                            <Link
                                href="/join"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-extrabold text-base rounded-2xl shadow-lg hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out"
                            >
                                <span>Create Your Free Portfolio Now</span>
                                <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                            </Link>
                        </div>

                        <p className="text-xs text-muted-foreground font-semibold relative z-10">
                            No credit card required • 100% free forever for candidates
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
