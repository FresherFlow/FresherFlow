'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, ChevronRight, GraduationCap, MapPin } from 'lucide-react';
import { Button } from '@/ui/Button';

// NOTE: no `revalidate` export here — this is a client boundary ('use client'
// for router.back), and route segment config exports from client components
// resolve to throwing stubs, which Next rejects as an invalid revalidate
// value at runtime.

const QUICK_LINKS = [
    {
        href: '/jobs',
        label: 'Jobs',
        text: 'Fresh off-campus roles.',
        Icon: Briefcase,
    },
    {
        href: '/jobs/internships',
        label: 'Internships',
        text: 'Internships freshers discuss.',
        Icon: GraduationCap,
    },
    {
        href: '/drives/walk-in',
        label: 'Walk-ins',
        text: 'City-wise walk-in drives.',
        Icon: MapPin,
    },
];

export default function NotFoundPage() {
    const router = useRouter();
    // Outer scrolls, inner centers: `m-auto` centering inside an
    // `overflow-hidden` flex parent clips the top when content exceeds the
    // viewport. `min-h-full` + justify-center centers short content yet grows
    // and scrolls instead of clipping. No brand row — the app header and
    // sidebar already carry the logo.
    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background text-foreground">
            <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
                <div
                    className="animate-in space-y-3 fade-in-0 slide-in-from-bottom-3 duration-500"
                    style={{ animationDelay: '90ms', animationFillMode: 'both' }}
                >
                    <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Lost in the feed
                    </p>
                    <h1 className="font-display text-7xl font-black leading-none tracking-tight drop-shadow-md md:text-8xl">
                        404
                    </h1>
                    <p className="mx-auto max-w-md text-2xl font-bold tracking-tight md:text-3xl">
                        This page missed the shortlist.
                    </p>
                    <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                        The link may be outdated, moved, or typed wrong. The rest of the
                        platform is fine — jump back in from here.
                    </p>
                </div>

                <div
                    className="flex animate-in flex-row flex-wrap items-center justify-center gap-3 fade-in-0 slide-in-from-bottom-3 duration-500"
                    style={{ animationDelay: '180ms', animationFillMode: 'both' }}
                >
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        Go back
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/">
                            Back to home
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Button>
                </div>

                <nav
                    aria-label="Where to go next"
                    className="w-full animate-in overflow-hidden rounded-xl border border-border/70 bg-card text-left fade-in-0 slide-in-from-bottom-3 duration-500"
                    style={{ animationDelay: '270ms', animationFillMode: 'both' }}
                >
                    <div className="divide-y divide-border">
                        {QUICK_LINKS.map(({ href, label, text, Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-foreground">{label}</span>
                                    <span className="block text-xs text-muted-foreground">{text}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </Link>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
}
