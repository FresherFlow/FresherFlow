'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils/utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { LogoImage } from './LogoImage';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/lib/api/offline/useOfflineActionQueue';
import { getNavRoutes } from './routeConfig';
import { useTheme } from '@/lib/providers/ThemeContext';


import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/ui/DropdownMenu';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/ui/Button';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export function DesktopNav() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const logout = context?.logout;

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
    const isCandidatePortfolioRoute = pathname.startsWith('/u/');

    const handleLogout = () => { if (logout) void logout('/login'); };

    const initialLetter = resolvedUser ? (resolvedUser.fullName?.[0] || resolvedUser.username?.[0] || 'U').toUpperCase() : 'U';

    return (
        <header className={cn(
            isLandingPage
                ? cn(
                    "fixed top-0 left-0 right-0 z-[100] hidden md:flex items-center justify-center pointer-events-none",
                    scrolled ? "pt-4 px-4" : "pt-2 px-4"
                  )
                : resolvedUser
                ? "fixed top-0 left-0 right-0 w-full h-[64px] bg-background/95 backdrop-blur-md border-b border-border/40 z-[100] hidden md:flex items-center justify-center"
                : "fixed top-0 left-0 right-0 w-full h-[64px] bg-background border-b border-border/10 z-[100] hidden md:flex items-center justify-center"
        )}>
            <nav className={cn(
                isLandingPage
                    ? cn(
                        'pointer-events-auto w-full flex items-center justify-between gap-4 transition-[max-width,height,background-color,box-shadow,backdrop-filter,padding] duration-200 ease-out px-6 shadow-none',
                        scrolled
                            ? 'max-w-4xl h-[52px] rounded-2xl border border-border/40 bg-background/80 dark:bg-card/75 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                            : 'max-w-7xl h-[64px] bg-transparent'
                      )
                    : 'relative w-full max-w-7xl h-full flex items-center justify-between gap-4 px-6'
            )}>

                {/* Brand Left */}
                <Link
                    href={resolvedUser && !isAuthRoute ? '/dashboard' : '/'}
                    onClick={(event) => {
                        const targetHref = resolvedUser && !isAuthRoute ? '/dashboard' : '/';
                        if (pathname === targetHref) event.preventDefault();
                    }}
                    aria-label="Home"
                    className="flex items-center gap-2.5 shrink-0 group z-10 active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                    <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                    <span className="text-[17px] font-semibold tracking-[0.01em] text-foreground leading-none">
                        FresherFlow
                    </span>
                </Link>

                {/* Center Nav Links - Fluid Flex Layout */}
                {!isCandidatePortfolioRoute && (
                <div className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 overflow-x-auto no-scrollbar">
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
                                    'px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.97] relative shrink-0 after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-[2px] after:rounded-full after:bg-foreground/40 after:transition-transform after:duration-300 after:origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
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

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 z-10">
                    <div className="shrink-0 flex items-center mr-1">
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>

                    {isCandidatePortfolioRoute ? (
                        <div className="flex items-center gap-2">
                            {resolvedUser ? (
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Create Profile
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {resolvedUser && pendingSyncCount > 0 && (
                                <span className="hidden lg:inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-300">
                                    {pendingSyncCount} pending
                                </span>
                            )}

                            {resolvedUser && !isAuthRoute ? (
                        <div className="flex items-center gap-2">
                            <AlertsDropdown />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button aria-label="User Menu" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border/60 text-xs font-bold uppercase transition-all duration-150 ease-out active:scale-[0.97] hover:border-primary/40 cursor-pointer focus:outline-none">
                                        {initialLetter}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none truncate">{resolvedUser.fullName || resolvedUser.username}</p>
                                            <p className="text-xs leading-none text-muted-foreground truncate">{resolvedUser.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/account" className="cursor-pointer flex items-center">
                                            <Squares2X2Icon className="mr-2 h-4 w-4" />
                                            <span>Account Hub</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer flex items-center">
                                            <UserCircleIcon className="mr-2 h-4 w-4" />
                                            <span>Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings" className="cursor-pointer flex items-center">
                                            <Cog6ToothIcon className="mr-2 h-4 w-4" />
                                            <span>Account Settings</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600 dark:focus:bg-red-500/20 dark:focus:text-red-400 cursor-pointer font-medium" onSelect={handleLogout}>
                                        <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (!isAuthRoute && pathname !== '/app') ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="px-2.5 py-1.5 text-xs font-semibold text-foreground hover:text-primary transition-all duration-150 ease-out active:scale-[0.97] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/app"
                                target="_self"
                                className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                Get App
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
