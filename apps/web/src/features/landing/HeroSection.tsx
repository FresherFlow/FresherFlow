import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import type { Opportunity } from '@fresherflow/types';
import { Button } from '@/ui/Button';
import { LandingStats } from '@/features/landing/LandingStats';
import { HeroJobCard } from './HeroJobCard';
import { CommunityTicker, type TickerEvent } from './CommunityTicker';

interface HeroSectionProps {
    liveCount: number;
    companiesCount: number;
    /** The real recent opening shown as the hero's signature object. */
    signatureJob?: Opportunity | null;
    /** Real board events for the ticker; empty renders the honest line. */
    events?: TickerEvent[];
}

/**
 * The landing hero (plan 16 §16.2/§16.4/§16.8, plan 17 §17.5).
 *
 * The thesis is "show the product, do not describe it": the headline is the
 * locked tagline, and the centrepiece is a real opening in product chrome with
 * its live signal strip. The copy that used to live here ("verified", "cleanest
 * fresher job feed") made a quality claim instead of showing the product and is
 * deliberately gone.
 */
export function HeroSection({ liveCount, companiesCount, signatureJob, events = [] }: HeroSectionProps) {
    return (
        <section className="relative px-6 pt-14 pb-16 md:pt-20 md:pb-24">
            {/* Board glows + grid: GPU-cheap, token-driven, dark-mode aware. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
                <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute left-1/2 top-40 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-signal-live/5 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[48px_48px] opacity-60" />
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-pin" aria-hidden="true" />
                    Jobs, powered by freshers
                </span>

                <h1 className="animate-fade-up mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance md:text-6xl">
                    Find jobs. Share opportunities. Help other freshers.
                </h1>

                <p className="animate-fade-up mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    Every opening carries who shared it and what other freshers found: who applied,
                    who reached the interview, what turned out closed.
                </p>

                <div className="animate-fade-up mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                    <Button variant="default" asChild className="w-full px-7 py-3 text-sm font-semibold sm:w-auto">
                        <Link href="/jobs">
                            Browse jobs
                            <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full px-7 py-3 text-sm font-semibold sm:w-auto">
                        <Link href="/post">Post an opportunity</Link>
                    </Button>
                </div>

                {signatureJob ? (
                    <div className="ff-pin-in mt-12 w-full flex justify-center">
                        <HeroJobCard job={signatureJob} />
                    </div>
                ) : null}

                <div className="mt-6 flex w-full max-w-2xl justify-center">
                    <CommunityTicker events={events} />
                </div>

                <div className="mt-10 w-full max-w-2xl">
                    <LandingStats
                        initialLiveCount={liveCount}
                        initialCompaniesCount={companiesCount}
                    />
                </div>
            </div>
        </section>
    );
}
