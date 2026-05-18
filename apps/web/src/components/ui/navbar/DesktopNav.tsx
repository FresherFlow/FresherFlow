'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { LogoImage } from './LogoImage';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { useOfflineActionQueue } from '@/lib/offline/useOfflineActionQueue';
import { getNavRoutes } from './routeConfig';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteMode } from '@/contexts/SiteModeContext';
import { ModeSwitch } from '@/components/site/ModeSwitch';

export function DesktopNav() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const isLoading = context?.isLoading;
    const pathname = usePathname();
    const { unreadCount } = useUnreadNotifications();
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { mode } = useSiteMode();
    const desktopRoutes = getNavRoutes(mode).filter(r => r.showInDesktop);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] hidden md:flex items-center justify-center pt-2 px-4 pointer-events-none">
            <nav className={cn(
                'pointer-events-auto w-full max-w-7xl flex items-center justify-between gap-4 rounded-2xl px-5 h-[60px] transition-all duration-300',
                scrolled
                    ? 'border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.97)] shadow-sm'
                    : 'border border-transparent bg-transparent shadow-none'
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
                                        'px-3.5 py-1.5 text-[15px] font-medium transition-colors duration-150 relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-foreground/40 after:transition-transform after:duration-300 after:origin-left',
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

                    {!isLoading && user && <ModeSwitch className="mr-1" />}
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
                            ) : (
                                /* TEMPORARY PIVOT: Hide Sign in button on web discovery layer */
                                /* 
                                <Link href="/login" className="ml-1 inline-flex items-center h-8 px-4 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-85 transition-all shadow-sm">
                                    Sign in
                                </Link>
                                */
                                <Link
                                    href="/download"
                                    target="_self"
                                    onClick={(event) => {
                                        if (pathname === '/download') event.preventDefault();
                                    }}
                                    className="ml-1 inline-flex items-center h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all shadow-sm"
                                >
                                    Get App
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
