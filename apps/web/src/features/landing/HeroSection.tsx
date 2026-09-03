'use client';
import Link from 'next/link';
import { Button } from '@/ui/Button';
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
                {/* Trust badge — visible immediately via CSS animation */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/70 backdrop-blur shadow-sm animate-fade-up" style={{ animationDelay: '0ms' }}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                        Every job verified before you apply
                    </span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tight leading-[1.1] text-foreground text-balance animate-fade-up" style={{ animationDelay: '60ms' }}>
                    The cleanest fresher job feed in India.
                </h1>

                {/* Subtext */}
                <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: '120ms' }}>
                    Direct links to verified off-campus jobs, internships, and walk-ins — sourced from official company sites. No spam. No redirects.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
                    <Button variant="default" size="sm" asChild className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide">
                        <Link href="/jobs">
                            Browse Jobs
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide">
                        <Link href="/app">
                            Get the App
                        </Link>
                    </Button>
                </div>

                {/* Stats */}
                <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
                    <LandingStats
                        initialLiveCount={liveCount}
                        initialCompaniesCount={companiesCount}
                    />
                </div>
            </div>

            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[48px_48px] -z-10 pointer-events-none" />
        </section>
    );
}
