'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils/utils';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { LogoImage } from './LogoImage';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { useOfflineActionQueue } from '@/lib/api/offline/useOfflineActionQueue';
import { getNavRoutes } from './routeConfig';
import { useTheme } from '@/lib/providers/ThemeContext';

import CaptionsTool from '@/app/(admin)/admin/captions/components/CaptionsTool';

export function DesktopNav() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const isLoading = context?.isLoading;
    const pathname = usePathname();
    const { unreadCount } = useUnreadNotifications();
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const desktopRoutes = getNavRoutes().filter(r => {
        if (!r.showInDesktop) return false;
        const isAuthRequired = r.href === '/dashboard' || r.href.startsWith('/account');
        if (isAuthRequired && !user) return false;
        return true;
    });

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={cn(
            "fixed top-0 left-0 right-0 z-[100] hidden md:flex items-center justify-center pointer-events-none transition-all duration-500 ease-in-out",
            scrolled ? "pt-4 px-4" : "pt-2 px-4"
        )}>
            <nav className={cn(
                'pointer-events-auto w-full flex items-center justify-between gap-4 transition-all duration-500 ease-in-out px-6 shadow-none',
                scrolled
                    ? 'max-w-3xl h-[52px] rounded-2xl border border-border/80 bg-background/80 dark:bg-card/75 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                    : 'max-w-7xl h-[64px] rounded-2xl border border-transparent bg-background/80 dark:bg-background/80 backdrop-blur-md'
            )}>

                {/* Brand */}
                <Link
                    href={user ? '/dashboard' : '/'}
                    onClick={(event) => {
                        const targetHref = user ? '/dashboard' : '/';
                        if (pathname === targetHref) event.preventDefault();
                    }}
                    className="flex items-center gap-2.5 shrink-0 group"
                >
                    <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                    <span className="text-[17px] font-semibold tracking-[0.01em] text-foreground leading-none">
                        FresherFlow
                    </span>
                </Link>

                {/* Center Nav Links */}
                {!isLoading && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
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
                                        'px-3.5 py-1.5 text-[15px] font-medium whitespace-nowrap transition-colors duration-150 relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-foreground/40 after:transition-transform after:duration-300 after:origin-left',
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
                <div className="flex items-center gap-1 shrink-0">
                    {!isLoading && user && pendingSyncCount > 0 && (
                        <span className="hidden lg:inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-300 mr-1">
                            {pendingSyncCount} pending
                        </span>
                    )}

                    {!isLoading && user && <CaptionsTool />}
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

                    {!isLoading && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-1 ml-1">
                                    <Link href="/alerts" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Notifications">
                                        <BellIcon className="w-[18px] h-[18px]" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
                                        )}
                                    </Link>
                                    <Link href="/account" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Account">
                                        <UserCircleIcon className="w-[18px] h-[18px]" />
                                    </Link>
                                </div>
                            ) : pathname !== '/app' ? (
                                <Link
                                    href="/app"
                                    target="_self"
                                    onClick={(event) => {
                                        if (pathname === '/app') event.preventDefault();
                                    }}
                                    className="ml-1 inline-flex items-center h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all shadow-sm"
                                >
                                    Get App
                                </Link>
                            ) : null}
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
