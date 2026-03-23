import Link from 'next/link';
import { LogoImage } from '@/components/ui/navbar/LogoImage';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/70 bg-background/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <LogoImage width={28} height={28} className="h-7 w-7 object-contain" />
                        <span className="text-[17px] font-semibold tracking-[0.01em] text-foreground">
                            FresherFlow
                        </span>
                    </Link>
                    <div className="hidden items-center gap-2 md:flex">
                        <Link href="/jobs" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Jobs
                        </Link>
                        <Link href="/internships" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Internships
                        </Link>
                        <Link href="/walk-ins" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Walk-ins
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_26%)]" />
                <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 md:min-h-[calc(100vh-5rem)] md:px-6">
                    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
                                404 - Page Not Found
                            </div>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                                    This page missed the shortlist.
                                </h1>
                                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                                    The link may be outdated, moved, or typed wrong. The rest of the platform is fine - you can jump straight back into fresh jobs, internships, and walk-ins from here.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90">
                                    Go to dashboard
                                </Link>
                                <Link href="/jobs" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary">
                                    Browse jobs
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.08)] backdrop-blur-md md:p-8">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Link href="/jobs" className="rounded-2xl border border-border/70 bg-background px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Explore</p>
                                    <p className="mt-3 text-xl font-semibold text-foreground">Jobs</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Fresh off-campus roles with direct apply links.</p>
                                </Link>
                                <Link href="/internships" className="rounded-2xl border border-border/70 bg-background px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Discover</p>
                                    <p className="mt-3 text-xl font-semibold text-foreground">Internships</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Verified internships filtered for fresher relevance.</p>
                                </Link>
                                <Link href="/walk-ins" className="rounded-2xl border border-border/70 bg-background px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Track</p>
                                    <p className="mt-3 text-xl font-semibold text-foreground">Walk-ins</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Upcoming drives, venue details, and city-specific walk-ins.</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
