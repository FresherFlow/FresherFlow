'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { usernameApi } from '@fresherflow/api-client';
import { isValidUsername, PROFILE_PAGE_ACTIVE_DAYS } from '@fresherflow/utils';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { SmoothScroll } from '@/features/landing/SmoothScroll';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import toast from 'react-hot-toast';

export function UPageClient() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const [username, setUsername] = useState('');
    const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [availabilityMsg, setAvailabilityMsg] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        const val = username.trim().toLowerCase();
        if (!val) {
            setAvailability('idle');
            setAvailabilityMsg('');
            return;
        }
        // Canonical rule, shared with the API — never re-derive it here.
        const rule = isValidUsername(val);
        if (!rule.valid) {
            setAvailability('invalid');
            setAvailabilityMsg(rule.reason || 'Invalid username');
            return;
        }
        setAvailability('checking');
        const t = setTimeout(async () => {
            try {
                const res = await usernameApi.check(val);
                if (res?.available) {
                    setAvailability('available');
                    setAvailabilityMsg('Available');
                } else {
                    setAvailability('taken');
                    setAvailabilityMsg(res?.reason || 'Taken');
                }
            } catch {
                setAvailability('idle');
                setAvailabilityMsg('');
            }
        }, 400);
        return () => clearTimeout(t);
    }, [username]);

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = username.trim().toLowerCase();
        if (!val || availability === 'taken' || availability === 'invalid' || availability === 'checking') return;

        // Signed in: claim straight from here. The server owns the cooldown rule, so a user
        // who already has a handle gets a clear error instead of a /dashboard bounce.
        if (user) {
            const hadUsername = Boolean(user.username);
            setIsClaiming(true);
            try {
                const res = await profileApi.claimUsername(val);
                if (res.success) {
                    toast.success('Username claimed!');
                    await refreshUser();
                    // A brand-new handle has nothing to show yet, so send them to fill the
                    // profile that will become /u/<handle>. Existing users just see theirs.
                    router.push(hadUsername ? `/u/${val}` : '/profile/complete');
                    return;
                } else {
                    toast.error(res.message || 'Failed to claim');
                    return;
                }
            } catch (err: any) {
                toast.error(err.message || 'Failed to claim');
                return;
            } finally {
                setIsClaiming(false);
            }
        }

        // Not logged in: go to single login with username prefill (keep only one login, no signup page)
        router.push(`/login?username=${encodeURIComponent(val)}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <SmoothScroll />
            {/* HERO — same as home HeroSection */}
            <section className="relative">
                <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-10">
                    <span className="ff-hero-note ff-pin-in">
                        <span aria-hidden className="text-[var(--ff-accent)]">·</span> <b>LIVE</b> — recruiter-ready profiles
                    </span>

                    <h1 className="ff-hero-h1 font-display text-[clamp(44px,7.4vw,92px)] font-extrabold leading-[0.98] tracking-[-0.03em]">
                        <span className="line" style={{ animationDelay: '0.05s' }}>
                            One link.
                        </span>
                        <span className="line" style={{ animationDelay: '0.18s' }}>
                            Your skills.
                        </span>
                        <span className="line" style={{ animationDelay: '0.34s' }}>
                            Your <span className="accent">career.</span>
                        </span>
                    </h1>

                    <p className="ff-hero-sub">
                        Stop sending fragmented links and cluttered PDFs. Get a recruiter-ready public profile with interactive project demos, structured skills and availability — at{' '}
                        <code className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-sm border border-border/60">fresherflow.in/u/yourname</code>.
                    </p>

                    <form onSubmit={handleClaim} className="flex flex-col sm:flex-row items-stretch gap-2 pt-6 max-w-lg">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-muted-foreground font-medium text-sm">fresherflow.in/u/</span>
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="yourname"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                className="block w-full pl-32 pr-4 py-3 bg-card border border-border/80 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-[2px] text-foreground font-bold text-sm transition-all outline-none placeholder:text-muted-foreground/40"
                                maxLength={20}
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-[18px] py-[10px] text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.98] shrink-0 disabled:opacity-60"
                            disabled={!username.trim() || availability === 'taken' || availability === 'invalid' || availability === 'checking' || isClaiming}
                        >
                            {isClaiming ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Claiming…
                                </span>
                            ) : (
                                <>
                                    Claim <ArrowRightIcon className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                    {availability !== 'idle' && !isClaiming && (
                        <p className={`pt-2 text-xs font-semibold ${availability === 'available' ? 'text-primary' : availability === 'taken' || availability === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {availability === 'checking' ? 'Checking…' : availabilityMsg}
                        </p>
                    )}

                    <div className="ff-hero-meta">
                        <span>· <b>100% FREE</b> FOR FRESHERS</span>
                        <span>· RECRUITER-READY SCHEMA</span>
                        <span>· LIVE IN 2 MIN</span>
                    </div>

                    <div className="ff-hero-eyebrow flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-pin)]" aria-hidden />
                        BOARD 00 · HOW IT WORKS
                        <span className="h-px flex-1 bg-border" aria-hidden />
                    </div>
                </div>
            </section>

            {/* PREVIEW — high-level demo like home ProofSection */}
            <section className="mx-auto max-w-[1120px] px-6 pb-16">
                <div className="rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
                    {/* Demo header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-xl shrink-0">
                                KS
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-extrabold tracking-tight">Krish Sharma</h3>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">● Market Ready</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium">1.2k views</span>
                                </div>
                                <p className="text-sm text-muted-foreground">B.Tech CSE — VTU · 2026 · Bengaluru · Available Immediately</p>
                                <p className="text-xs font-mono text-primary">fresherflow.in/u/krish_sharma</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">Request intro</span>
                            <span className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium">Share →</span>
                        </div>
                    </div>
                    {/* Demo body */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                        <div className="lg:col-span-2 border-r border-border p-6 space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured Projects · 3</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-border p-4 space-y-2 hover:border-primary/30 hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between"><h5 className="font-bold text-sm">AI Scanner</h5><span className="text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Live</span></div>
                                        <p className="text-xs text-muted-foreground">Real-time pipeline · TypeScript · Redis · BullMQ</p>
                                        <div className="flex gap-1 flex-wrap"><span className="text-xs px-1.5 py-0.5 bg-muted rounded">TypeScript</span><span className="text-xs px-1.5 py-0.5 bg-muted rounded">Next.js</span></div>
                                    </div>
                                    <div className="rounded-xl border border-border p-4 space-y-2 hover:border-primary/30 hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between"><h5 className="font-bold text-sm">Mobile App</h5><span className="text-xs px-1.5 py-0.5 rounded border">GitHub</span></div>
                                        <p className="text-xs text-muted-foreground">Expo · MMKV · Offline sync</p>
                                        <div className="flex gap-1"><span className="text-xs px-1.5 py-0.5 bg-muted rounded">Expo</span><span className="text-xs px-1.5 py-0.5 bg-muted rounded">React</span></div>
                                    </div>
                                    <div className="rounded-xl border border-border p-4 space-y-2 hover:border-primary/30 hover:shadow-md transition-all">
                                        <h5 className="font-bold text-sm">Walk-in Map</h5>
                                        <p className="text-xs text-muted-foreground">Hyderabad drives · Leaflet · Supercluster</p>
                                        <div className="flex gap-1"><span className="text-xs px-1.5 py-0.5 bg-muted rounded">Leaflet</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skills · 9</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {['TypeScript','Next.js','React','Node.js','PostgreSQL','Prisma','Redis','Tailwind','Expo'].map(s => (
                                        <span key={s} className="px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 bg-muted/20">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Looking for</h4>
                                <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                                    <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cities</p><p className="text-sm font-medium">Bengaluru, Hyderabad, Remote</p></div>
                                    <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work mode</p><p className="text-sm font-medium">Onsite, Hybrid, Remote</p></div>
                                    <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected CTC</p><p className="text-sm font-bold text-primary">6 LPA</p></div>
                                    <a href="#" className="inline-flex text-xs font-semibold text-primary hover:underline">View resume ↗</a>
                                </div>
                            </div>
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
                                <p className="text-sm font-bold">Hiring Krish?</p>
                                <p className="text-xs text-muted-foreground">1-click intro — no middlemen</p>
                                <span className="inline-flex px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">Request intro</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHY — same 3 cards as before but band style */}
            <section className="ff-band border-y border-[#2a3448] py-14">
                <div className="mx-auto max-w-[1120px] px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <p className="font-record text-[11px] uppercase tracking-[0.14em] text-[#8b93a5]">Why stand out</p>
                        <h2 className="font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em] text-[#eef1f6]">Built for how engineering teams hire.</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-[#2a3448] bg-[#2a3448]">
                        {[
                            { title: "Interactive Project Demos", desc: "1-click live apps and GitHub docs, not just names." },
                            { title: "Structured Preferences", desc: "Job, Internship, Walk-In and work mode visible instantly." },
                            { title: "Academic Timeline", desc: "10th, 12th, UG, PG in a clean chronological view." },
                        ].map((f) => (
                            <div key={f.title} className="bg-[#0e1420] px-6 pb-6 pt-7 space-y-2">
                                <h3 className="font-bold text-[#eef1f6]">{f.title}</h3>
                                <p className="text-sm text-[#8b93a5]">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ + FINAL CTA — same as before */}
            <section className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
                    <div className="text-center space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">FAQ</h2>
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">Questions, answered.</p>
                    </div>
                    <div className="space-y-3">
                        {[
                            { q: "Is it really free?", a: "Yes — 100% free for students & freshers." },
                            { q: "Who can see it?", a: `Anyone with your fresherflow.in/u/username link. Turn recruiter intro requests on or off anytime. The page stays live for ${PROFILE_PAGE_ACTIVE_DAYS} days at a time — reactivate it to keep the link working.` },
                            { q: "Can I edit after?", a: "Yes — edit from /profile, live instantly." },
                            { q: "What do recruiters see?", a: "Skills, projects with live/GitHub, education, availability and one-click Request intro." },
                        ].map((item) => (
                            <details key={item.q} className="group rounded-2xl border border-border/60 bg-card p-5 open:bg-card">
                                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                                    <span className="text-sm font-bold">{item.q}</span>
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌃</span>
                                </summary>
                                <p className="pt-3 text-sm text-muted-foreground">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24 text-center border-t border-border/60">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                        Claim yours — <span className="text-primary">fresherflow.in/u/</span>yourname
                    </h2>
                    <form onSubmit={handleClaim} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-lg mx-auto">
                        <div className="relative flex-1 w-full">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-muted-foreground font-medium text-sm">fresherflow.in/u/</span>
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="yourname"
                                className="block w-full pl-32 pr-4 py-3 bg-card border border-border/80 rounded-[2px] text-foreground font-bold text-sm outline-none"
                                maxLength={30}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-[18px] py-[10px] text-[13.5px] font-semibold text-white hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
                            disabled={!username.trim() || availability === 'taken' || availability === 'invalid' || availability === 'checking' || isClaiming}
                        >
                            {isClaiming ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Claiming…
                                </span>
                            ) : (
                                <>Claim</>
                            )}
                        </button>
                    </form>
                    {availability !== 'idle' && !isClaiming && (
                        <p className={`pt-2 text-xs font-semibold ${availability === 'available' ? 'text-primary' : availability === 'taken' || availability === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {availability === 'checking' ? 'Checking…' : availabilityMsg}
                        </p>
                    )}
                </div>
            </section>

            <SiteFooter />
        </div>
    );
}
