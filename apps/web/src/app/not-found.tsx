import Link from 'next/link';
import { Briefcase, GraduationCap, MapPin, ArrowRight } from 'lucide-react';

// Static page — never changes. Permanently cache after first render to avoid
// compute charges on every bot hit against unknown/expired URLs.
export const revalidate = false;

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="relative overflow-hidden">
                <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 md:min-h-[calc(100vh-5rem)] md:px-6">
                    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3.5">
                                <span className="text-5xl font-black tracking-tight text-primary md:text-7xl">404</span>
                                <div className="h-8 w-px bg-border md:h-12" />
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Page Not Found</span>
                            </div>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
                                    This page missed the shortlist.
                                </h1>
                                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                                    The link may be outdated, moved, or typed wrong. The rest of the platform is fine - you can jump straight back into fresh jobs, internships, and walk-ins from here.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link href="/opportunities" className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90">
                                    Go to opportunities
                                </Link>
                                <Link href="/jobs" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary">
                                    Browse jobs
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 grid-cols-1">
                            <Link href="/jobs" className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(var(--primary-rgb),0.02)]">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-foreground">Jobs</p>
                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Explore</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground truncate">Fresh off-campus roles with direct apply links.</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 transform group-hover:translate-x-1 group-hover:text-primary" />
                            </Link>
                            <Link href="/internships" className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(var(--primary-rgb),0.02)]">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-foreground">Internships</p>
                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Discover</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground truncate">Verified internships filtered for fresher relevance.</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 transform group-hover:translate-x-1 group-hover:text-primary" />
                            </Link>
                            <Link href="/walk-ins" className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(var(--primary-rgb),0.02)]">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-foreground">Walk-ins</p>
                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Track</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground truncate">Upcoming drives and city-specific walk-ins.</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 transform group-hover:translate-x-1 group-hover:text-primary" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
