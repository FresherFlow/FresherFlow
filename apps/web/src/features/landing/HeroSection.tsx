import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { LandingStats } from '@/features/landing/LandingStats';
import type { Opportunity } from '@fresherflow/types';

interface HeroSectionProps {
    liveCount: number;
    companiesCount: number;
}

export function HeroSection({ liveCount, companiesCount }: HeroSectionProps) {

    return (
        <section className="relative min-h-[calc(100vh-3.75rem)] md:min-h-[calc(100vh-4.75rem)] flex items-center justify-center pt-10 pb-14 md:py-20 px-6">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 w-full">
                {/* Trust badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/70 backdrop-blur shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                        Every job verified before you apply
                    </span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tight leading-[1.1] text-foreground text-balance">
                    The cleanest fresher job feed in India.
                </h1>

                {/* Subtext */}
                <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                    Direct links to verified off-campus jobs, internships, and walk-ins — sourced from official company sites. No spam. No redirects.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
                    <Link
                        href="/opportunities"
                        className="premium-button w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
                    >
                        Browse Jobs
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/app"
                        className="premium-button-outline w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
                    >
                        Get the App
                    </Link>
                </div>

                {/* Stats */}
                <LandingStats
                    initialLiveCount={liveCount}
                    initialCompaniesCount={companiesCount}
                />
            </div>

            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[48px_48px] -z-10 pointer-events-none" />
        </section>
    );
}
