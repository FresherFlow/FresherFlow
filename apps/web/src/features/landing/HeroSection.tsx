import Image from 'next/image';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import { LandingStats } from '@/features/landing/LandingStats';
import type { Opportunity } from '@fresherflow/types';

interface HeroSectionProps {
    liveCount: number;
    opportunities: Opportunity[];
}

export function HeroSection({ liveCount, opportunities }: HeroSectionProps) {
    const companiesCount = new Set(opportunities.map(o => o.company).filter(Boolean)).size;

    return (
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
                        Verified Off-Campus Jobs &amp; Internships.
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                        Your first job search should be easy, clean, and honest. We find and check every job and internship directly from official company websites, giving you direct apply links without any spam, ads, or fake listings.
                    </p>

                    {/* Hero image — shown inline on mobile only */}
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
                        initialCompaniesCount={companiesCount}
                    />
                </div>

                {/* Hero image — desktop only */}
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
    );
}
