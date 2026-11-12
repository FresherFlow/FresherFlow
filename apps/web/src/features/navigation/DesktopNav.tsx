'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from "@/ui/cn";
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { LogoImage } from '@/features/shell/LogoImage';
import { useOfflineActionQueue } from '@/hooks/useOfflineActionQueue';
import { getNavRoutes } from './routeConfig';
import { useMarqueeHidden } from '@/hooks/useMarqueeHidden';
import { MARQUEE_ENABLED } from '@/features/landing/LandingMarquee';
import { NavMegaMenu } from './NavMegaMenu';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/ui/Button';

export function DesktopNav() {
    const context = useContext(AuthContext);
    const user = context?.user;

    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const pendingSyncCount = useOfflineActionQueue(isMounted ? user?.id : undefined);
    const [scrolled, setScrolled] = useState(false);
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';

    useEffect(() => { setIsMounted(true); }, []);

    // Before mount: render unauthenticated routes so SSR and first client paint match
    const resolvedUser = isMounted ? user : null;

    const desktopRoutes = isAuthRoute ? [] : getNavRoutes().filter(r => {
        if (!r.showInDesktop) return false;
        const isAuthRequired = r.requiresAuth || r.href === '/jobs?tab=for-you' || r.href.startsWith('/account');
        if (isAuthRequired && !resolvedUser) return false;
        return true;
    });

    useEffect(() => {
        setScrolled(false);
        const timer = setTimeout(() => {
            setScrolled(window.scrollY > 20);
        }, 100);

        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            clearTimeout(timer);
        };
    }, [pathname]);

    const isLandingPage = pathname === '/';
    // Landing rides the marquee: nav moves to top-0 when the marquee hides on scroll down.
    // With the strip off there is no band to sit under, so the header stays at top-0.
    const marqueeHidden = useMarqueeHidden(isLandingPage && MARQUEE_ENABLED);
    const underMarquee = isLandingPage && MARQUEE_ENABLED && !marqueeHidden;
    const isCandidatePortfolioRoute = pathname.startsWith('/u/');

    // ONE header everywhere: same 60px height, same border, same actions.
    // Only the landing sits under the marquee (top-7 → top-0 on scroll).
    return (
        <header className={cn(
            "fixed top-0 left-0 right-0 z-50 h-15 items-center bg-background border-b border-border/60 hidden lg:flex transition-transform duration-300 ease-out motion-reduce:transition-none",
            // Translate instead of animating `top`: transform is composited,
            // and this moves on every scroll direction change.
            underMarquee ? 'translate-y-7' : 'translate-y-0'
        )}>
            <nav className="mx-auto w-full max-w-7xl h-15 flex items-center justify-between gap-4 px-6">

                {/* Brand Left */}
                {/* The brand always goes home. It used to send a signed-in user
                    to the For You tab, so the wordmark stopped meaning "the
                    site" and started meaning "my saved feed". */}
                <Link
                    href="/"
                    onClick={(event) => {
                        if (pathname === '/') event.preventDefault();
                    }}
                    aria-label="FresherFlow home"
                    className="flex items-center gap-2.5 shrink-0 group z-10 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                    <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                    <span className="text-lg font-semibold tracking-wide text-foreground leading-none">
                        FresherFlow
                    </span>
                </Link>

                {/* Center Nav Links — left-aligned next to the brand (landing) */}
                {!isCandidatePortfolioRoute && (
                <div className={cn(
                    // Spacing is `lg`-tight and `xl`-roomy on purpose: at 1024
                    // the seven desktop routes plus brand and actions need
                    // ~40px more than the bar has, so the last link was clipped
                    // by the overflow container with no scroll affordance.
                    'flex-1 flex items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar',
                    !isLandingPage && 'justify-center px-2'
                )}>
                    {!isAuthRoute && (
                        <div className="mx-auto flex items-center gap-1 xl:gap-2">
                            <NavMegaMenu isLanding={isLandingPage} marqueeHidden={marqueeHidden} />
                            {desktopRoutes.map((route) => {
                        const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`);
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                onClick={(event) => {
                                    if (isActive) event.preventDefault();
                                }}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'px-2 lg:px-2.5 xl:px-3 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap transition duration-150 ease-out active:scale-[0.97] relative shrink-0 motion-reduce:transform-none after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-0.5 after:rounded-full after:bg-foreground/40 after:transition-transform after:duration-300 after:ease-out after:origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
                                    isActive
                                        ? 'text-foreground after:scale-x-100'
                                        : 'text-muted-foreground hover:text-foreground after:scale-x-0'
                                )}
                            >
                                {route.label}
                            </Link>
                        );
                    })}
                        </div>
                    )}
                </div>
                )}

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 z-10">
                    <div className="shrink-0 flex items-center mr-1">
                        <ThemeSwitcher/>
                    </div>

                    {isCandidatePortfolioRoute ? (
                        <div className="flex items-center gap-2">
                            {resolvedUser ? (
                                <Link
                                    href="/jobs?tab=for-you"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Create Profile
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {resolvedUser && pendingSyncCount > 0 && (
                                <span className="hidden lg:inline-flex items-center rounded-full border border-signal-aging/30 bg-signal-aging/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-signal-aging">
                                    {pendingSyncCount} pending
                                </span>
                            )}

                            {/* Header rule: no bell, no avatar, ever. Sign in / Post stay
                                as plain control buttons. Account and log out live in the
                                sidebar user footer (NavUser). */}
                            {!isAuthRoute && (
                                <div className="flex items-center gap-2.5">
                                    <Link href="/login" className="ff-nav-btn">
                                        Sign in
                                    </Link>
                                    <Link href="/contribute" className="ff-nav-btn ff-nav-btn-primary">
                                        Contribute
                                    </Link>
                                </div>
                            )}
                    </>
                    )}
                </div>
            </nav>
        </header>
    );
}
