'use client';

import Link from 'next/link';
import { cn } from '@/ui/cn';

/**
 * The one logged-out header control.
 *
 * Two headers draw the top bar: `DesktopNav` for the public routes (the
 * landing page among them) and `SiteHeader` for every sidebar route. Each
 * grew its own log-in link, and they disagreed on all three things a button
 * is made of: the label ("Sign in" vs "Log in"), the shape (`.ff-nav-btn`'s
 * 2px radius, 7px/14px padding, foreground hairline vs a 32px boxed control
 * with an 8px radius and a `bg-card` fill), and the colours. The landing page
 * was the odd one out, so the same destination looked like a different
 * product depending on the page you happened to be on.
 *
 * One component, imported by both, means the label and the geometry cannot
 * drift again. `SiteHeader` is the reference: its boxed control is what the
 * whole feed app already shows.
 */
export function LoginButton({ className }: { className?: string }) {
    return (
        <Link
            href="/login"
            className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground',
                'ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-foreground/40 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                className
            )}
        >
            Log in
        </Link>
    );
}
