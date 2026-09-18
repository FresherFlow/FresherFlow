'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils/utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { LogoImage } from './LogoImage';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/lib/api/offline/useOfflineActionQueue';
import { getNavRoutes } from './routeConfig';
import { useTheme } from '@/lib/providers/ThemeContext';
import { useMarqueeHidden } from '@/lib/navigation/useMarqueeHidden';
import { NavMegaMenu } from './NavMegaMenu';


import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/ui/DropdownMenu';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/ui/Button';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export function DesktopNav() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const logout = context?.logout;

    const router = useRouter();
    const pathname = usePathname();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { unreadCount } = useUnreadNotifications();
    const [isMounted, setIsMounted] = useState(false);
    const pendingSyncCount = useOfflineActionQueue(isMounted ? user?.id : undefined);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';

    useEffect(() => { setIsMounted(true); }, []);

    // Before mount: render unauthenticated routes so SSR and first client paint match
    const resolvedUser = isMounted ? user : null;

    const desktopRoutes = isAuthRoute ? [] : getNavRoutes().filter(r => {
        if (!r.showInDesktop) return false;
        const isAuthRequired = r.requiresAuth || r.href === '/dashboard' || r.href.startsWith('/account');
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
    // Landing rides the marquee: nav moves to top-0 when the marquee hides on scroll down
    const marqueeHidden = useMarqueeHidden(isLandingPage);
    const isCandidatePortfolioRoute = pathname.startsWith('/u/');

    const handleLogout = () => { if (logout) void logout('/login'); };

    const initialLetter = resolvedUser ? (resolvedUser.fullName?.[0] || resolvedUser.username?.[0] || 'U').toUpperCase() : 'U';

    // ONE header everywhere: same 60px height, same border, same actions.
    // Only the landing sits under the marquee (top-7 → top-0 on scroll).
    return (
        <header className={cn(
            "select-none fixed left-0 right-0 z-50 h-15 items-center bg-background border-b border-border/60 hidden lg:flex transition-all duration-300 ease-out",
            isLandingPage ? (marqueeHidden ? 'top-0' : 'top-7') : 'top-0'
        )}>
            <nav className="mx-auto w-full max-w-7xl h-15 flex items-center justify-between gap-4 px-6">

                {/* Brand Left */}
                <Link
                    href={resolvedUser && !isAuthRoute ? '/dashboard' : '/'}
                    onClick={(event) => {
                        const targetHref = resolvedUser && !isAuthRoute ? '/dashboard' : '/';
                        if (pathname === targetHref) event.preventDefault();
                    }}
                    aria-label="Home"
                    className="flex items-center gap-2.5 shrink-0 group z-10 active:scale-95 transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                    <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                    <span className="text-lg font-semibold tracking-wide text-foreground leading-none">
                        FresherFlow
                    </span>
                </Link>

                {/* Center Nav Links — left-aligned next to the brand (landing) */}
                {!isCandidatePortfolioRoute && (
                <div className={cn(
                    'flex-1 flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar',
                    !isLandingPage && 'justify-center px-2'
                )}>
                    {!isAuthRoute && (
                        <div className="mx-auto flex items-center gap-1 md:gap-2">
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
                                    'px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-150 ease-out active:scale-95 relative shrink-0 after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-0.5 after:rounded-full after:bg-foreground/40 after:transition-transform after:duration-300 after:ease-out after:origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
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
                                    href="/dashboard"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

                            {resolvedUser && !isAuthRoute ? (
                        <div className="flex items-center gap-2">
                            <AlertsDropdown />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button aria-label="User Menu" suppressHydrationWarning className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border/60 text-xs font-bold uppercase transition-all duration-150 ease-out active:scale-95 hover:border-primary/40 cursor-pointer focus:outline-none">
                                        {initialLetter}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none truncate">{resolvedUser.fullName || resolvedUser.username}</p>
                                            <p className="text-xs leading-none text-muted-foreground truncate">{resolvedUser.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer flex items-center">
                                        <Squares2X2Icon className="mr-2 h-4 w-4" />
                                        <span>Account Hub</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer flex items-center">
                                        <UserCircleIcon className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer flex items-center">
                                        <Cog6ToothIcon className="mr-2 h-4 w-4" />
                                        <span>Account Settings</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
                                        <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (!isAuthRoute) ? (
                        <div className="flex items-center gap-2.5">
                            <Link href="/login" className="ff-nav-btn">
                                Sign in
                            </Link>
                            <Link href="/post" className="ff-nav-btn ff-nav-btn-primary">
                                Post ✦
                            </Link>
                        </div>
                    ) : null}
                    </>
                    )}
                </div>
            </nav>
        </header>
    );
}
