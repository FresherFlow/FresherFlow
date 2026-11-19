'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
    const pathname = usePathname();

    return (
        <div className="relative flex min-h-0 w-full flex-1 overflow-y-auto bg-background text-foreground">
            <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-12">
                <section className="rounded-2xl border border-border-strong bg-card p-6 dark:border-transparent md:p-8">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            <span className="text-meta font-medium text-muted-foreground">Lost in the feed</span>
                        </div>
                        <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                            404
                        </span>
                    </div>

                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground text-balance md:text-3xl">
                        We couldn&apos;t find that page.
                    </h1>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                        The link may be old or typed wrong. Start from the jobs feed, or go back to where you were.
                    </p>
                    {pathname && (
                        <p className="mt-3 truncate text-xs text-muted-foreground" title={pathname}>
                            You were looking for <span className="font-medium text-foreground">{pathname}</span>
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                            <Link href="/jobs">
                                Browse jobs
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.back()}>
                            Go back
                        </Button>
                    </div>

                    <div className="mt-6 border-t border-border pt-5">
                        <h2 className="text-xs font-semibold text-muted-foreground">Popular destinations</h2>
                        <div className="mt-2 grid gap-1.5">
                            {QUICK_LINKS.map(({ href, label, text, Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="group flex items-center gap-3 rounded-lg bg-surface-sunken px-3 py-2.5 transition-colors duration-150 ease-out"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-foreground">
                                        <Icon className="size-4" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">{label}</span>
                                        <span className="block text-xs text-muted-foreground">{text}</span>
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground" aria-hidden="true" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
