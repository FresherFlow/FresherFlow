'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, GraduationCap, MapPin } from 'lucide-react';
import { LogoImage } from '@/features/shell/LogoImage';
import { Button } from '@/ui/Button';

// NOTE: no `revalidate` export here — this is a client boundary ('use client'
// for router.back), and route segment config exports from client components
// resolve to throwing stubs, which Next rejects as an invalid revalidate
// value at runtime.

const QUICK_LINKS = [
    {
        href: '/jobs',
        label: 'Jobs',
        tag: 'Explore',
        text: 'Fresh off-campus roles with direct apply links.',
        Icon: Briefcase,
    },
    {
        href: '/jobs/internships',
        label: 'Internships',
        tag: 'Discover',
        text: 'Current internships shared and discussed by freshers.',
        Icon: GraduationCap,
    },
    {
        href: '/drives/walk-in',
        label: 'Walk-ins',
        tag: 'Track',
        text: 'Upcoming drives and city-specific walk-ins.',
        Icon: MapPin,
    },
];

export default function NotFoundPage() {
    const router = useRouter();
    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground">
            <div className="m-auto flex w-full max-w-4xl flex-col items-center gap-8 overflow-y-auto px-4 py-8 text-center">
                <Link
                    href="/"
                    aria-label="FresherFlow home"
                    className="flex animate-in items-center gap-2.5 fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500"
                >
                    <LogoImage width={28} height={28} className="h-7 w-7 object-contain" />
                    <span className="text-lg font-semibold tracking-wide">FresherFlow</span>
                </Link>

                <div
                    className="animate-in space-y-3 fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500"
                    style={{ animationDelay: '90ms' }}
                >
                    <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Lost in the feed
                    </p>
                    <h1 className="-rotate-2 font-display text-7xl font-black leading-none tracking-tight drop-shadow-md md:text-8xl">
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
                    className="flex animate-in flex-wrap items-center justify-center gap-3 fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500"
                    style={{ animationDelay: '180ms' }}
                >
                    <Button variant="outline" onClick={() => router.back()}>
                        Go back
                    </Button>
                    <Button asChild>
                        <Link href="/">Back to home</Link>
                    </Button>
                </div>

                <div
                    className="grid w-full animate-in gap-3 text-left fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500 sm:grid-cols-3"
                    style={{ animationDelay: '270ms' }}
                >
                    {QUICK_LINKS.map(({ href, label, tag, text, Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                                <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-foreground">{label}</span>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {tag}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {text}
                                </span>
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
