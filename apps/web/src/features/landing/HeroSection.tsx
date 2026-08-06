'use client';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { LandingStats } from '@/features/landing/LandingStats';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Opportunity } from '@fresherflow/types';
import { motion } from 'framer-motion';

interface HeroSectionProps {
    liveCount: number;
    companiesCount: number;
}

export function HeroSection({ liveCount, companiesCount }: HeroSectionProps) {

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <section className="relative min-h-[calc(100vh-3.75rem)] md:min-h-[calc(100vh-4.75rem)] flex items-center justify-center pt-10 pb-14 md:py-20 px-6">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 w-full">
                {/* Trust badge */}
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/70 backdrop-blur shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                        Every job verified before you apply
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1 variants={itemVariants} className="text-4xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tight leading-[1.1] text-foreground text-balance">
                    The cleanest fresher job feed in India.
                </motion.h1>

                {/* Subtext */}
                <motion.p variants={itemVariants} className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                    Direct links to verified off-campus jobs, internships, and walk-ins — sourced from official company sites. No spam. No redirects.
                </motion.p>

                {/* CTAs */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
                    <Link
                        href="/opportunities"
                        className="premium-button w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms] ease-out"
                    >
                        Browse Jobs
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/app"
                        className="premium-button-outline w-full sm:w-auto px-8 py-3.5 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms] ease-out"
                    >
                        Get the App
                    </Link>
                </motion.div>

                {/* Stats */}
                <motion.div variants={itemVariants}>
                    <LandingStats
                        initialLiveCount={liveCount}
                        initialCompaniesCount={companiesCount}
                    />
                </motion.div>
            </motion.div>

            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[48px_48px] -z-10 pointer-events-none" />
        </section>
    );
}
