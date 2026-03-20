import type { Metadata } from 'next';
import Link from 'next/link';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import CheckBadgeIcon from '@heroicons/react/24/outline/CheckBadgeIcon';

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
                alt: 'FresherFlow — Verified Fresher Jobs and Internships',
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

async function getLiveOpportunityCount(): Promise<number> {
    try {
        const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const base = apiUrl.replace(/\/+$/, '');
        const res = await fetch(`${base}/api/stats`, {
            next: { revalidate: 86400 },
        });
        if (!res.ok) return 0;
        const data = await res.json() as { opportunities?: number };
        return typeof data.opportunities === 'number' ? data.opportunities : 0;
    } catch {
        return 0;
    }
}

export default async function LandingPage() {
    const liveCount = await getLiveOpportunityCount();
    const countLabel = liveCount > 0 ? `${liveCount}+` : 'Daily';
    return (
        <>
            <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
                <div className="absolute top-0 left-0 right-0 h-20 z-10" />

                <main className="flex-1 flex flex-col">
                    {/* Hero */}
                    <section className="relative pt-12 pb-16 md:pt-20 md:pb-20 px-6 overflow-hidden">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative z-10">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/70 backdrop-blur">
                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Verified feed live</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-foreground">
                                    The verified career feed for fresh graduates.
                                </h1>
                                <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                                    FresherFlow replaces noisy job boards with a clean, trusted stream of off-campus jobs,
                                    internships, and walk-ins. Every link is checked before it ships.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link href="/opportunities" className="premium-button px-6 text-[12px] uppercase tracking-widest">
                                        Open the live feed
                                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                                    </Link>
                                    <Link href="/login" className="premium-button-outline px-6 text-[12px] uppercase tracking-widest">
                                        Sign in
                                    </Link>
                                </div>
                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    {[
                                        { label: 'Links checked', value: '100%' },
                                        { label: 'Verified listings', value: countLabel },
                                        { label: 'Noise removed', value: 'Zero spam' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="rounded-xl border border-border bg-card/80 p-4">
                                            <div className="text-lg font-bold text-foreground">{stat.value}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur p-5 shadow-2xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-success">Verified</span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {[
                                        { company: 'Google', role: 'SDE-1 (Off Campus)', type: 'Job', status: 'Verified' },
                                        { company: 'Amazon', role: 'Front-end Intern', type: 'Internship', status: 'Active' },
                                        { company: 'Zomato', role: 'Graduate Engineer Trainee', type: 'Walk-in', status: 'Verified' }
                                    ].map((item, i) => (
                                        <div key={i} className="rounded-2xl border border-border bg-background/70 p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground">{item.role}</h3>
                                                    <p className="text-[11px] font-medium text-muted-foreground">{item.company}</p>
                                                </div>
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/10 text-primary">
                                                    {item.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                                                    {item.status}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground uppercase">Direct apply</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-size-[48px_48px] -z-10" />
                    </section>

                    {/* Trust ledger */}
                    <section className="py-14 md:py-20 px-6">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.45fr_1fr] gap-8 items-start">
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trust ledger</p>
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Signals that keep the feed clean.</h2>
                                <p className="text-sm text-muted-foreground">
                                    Every listing earns its place. We track sources, link health, expiry dates, and recruiter credibility.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Verified links', text: 'Manual checks eliminate broken apply links.' },
                                    { title: 'No duplicates', text: 'Smart dedupe keeps the feed clean.' },
                                    { title: 'Expiry tracking', text: 'Old posts are auto-flagged and removed.' },
                                    { title: 'Source tags', text: 'Know if it came from company or ATS.' },
                                ].map((item) => (
                                    <div key={item.title} className="rounded-2xl border border-border bg-card/80 p-5 space-y-2">
                                        <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Audience split */}
                    <section className="py-14 md:py-20 px-6">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-3xl border border-border bg-card/80 p-6 md:p-8 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For candidates</p>
                                <h3 className="text-2xl font-bold">A single feed that actually respects your time.</h3>
                                <p className="text-sm text-muted-foreground">
                                    No spam, no fake links, no repeated posts. Just verified opportunities you can act on fast.
                                </p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <span className="px-2 py-1 rounded-full bg-muted/50 border border-border">Real links</span>
                                    <span className="px-2 py-1 rounded-full bg-muted/50 border border-border">Fast filters</span>
                                    <span className="px-2 py-1 rounded-full bg-muted/50 border border-border">Saved feed</span>
                                </div>
                            </div>
                            <div className="rounded-3xl border border-border bg-card/80 p-6 md:p-8 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For recruiters</p>
                                <h3 className="text-2xl font-bold">Cleaner pipelines, better-prepared applicants.</h3>
                                <p className="text-sm text-muted-foreground">
                                    Profiles are gated for completeness, so you see candidates with verified, usable data.
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CheckBadgeIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile gate</p>
                                        <p className="text-sm font-semibold">Completion required before apply.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Verification steps */}
                    <section id="verification" className="py-14 md:py-20 px-6">
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="text-center space-y-3 max-w-2xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Verification pipeline</h2>
                                <p className="text-muted-foreground text-sm md:text-base">
                                    Every listing passes a multi-step review before it reaches the feed.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { step: '01', title: 'Index', desc: 'Pull from official sources, ATS, and drives.' },
                                    { step: '02', title: 'Verify', desc: 'Humans validate links, eligibility, and timing.' },
                                    { step: '03', title: 'Ship', desc: 'Only verified listings reach candidates.' }
                                ].map((item) => (
                                    <div key={item.step} className="rounded-2xl border border-border bg-card/80 p-6 space-y-3">
                                        <span className="text-3xl font-bold text-primary/20 tracking-tight">{item.step}</span>
                                        <h3 className="text-lg font-semibold">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Collections — desktop only, redundant with nav tabs on mobile */}
                    <section className="hidden md:block py-14 md:py-20 px-6">
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="text-center space-y-3 max-w-2xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Browse by collection</h2>
                                <p className="text-muted-foreground text-sm md:text-base">Focused feeds for every format.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { title: 'Verified jobs', desc: 'Full-time roles and graduate programs.', href: '/jobs' },
                                    { title: 'Internships', desc: 'Summer, winter, and off-cycle openings.', href: '/internships' },
                                    { title: 'Walk-ins', desc: 'On-site drives with clear venue info.', href: '/walk-ins' },
                                ].map((item) => (
                                    <Link key={item.title} href={item.href} className="group rounded-2xl border border-border bg-card/80 p-6 space-y-3 transition-all hover:-translate-y-1">
                                        <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover:text-accent">Explore</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Final CTA */}
                    <section className="py-16 md:py-20 px-6">
                        <div className="max-w-5xl mx-auto text-center space-y-6 rounded-3xl border border-border bg-card/80 p-8 md:p-12 shadow-2xl">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Stop searching. Start applying.</h2>
                            <p className="text-muted-foreground text-base md:text-lg">
                                Open the verified feed and move fast on real opportunities.
                            </p>
                            <div className="flex justify-center">
                                <Link href="/opportunities" className="premium-button px-8 text-[12px] uppercase tracking-widest">
                                    Open the feed
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}







