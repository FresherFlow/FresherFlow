'use client';

import Link from 'next/link';
import { LogoImage } from './LogoImage';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils/utils';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/lib/api/offline/useOfflineActionQueue';

import { getNavRoutes } from './routeConfig';


const MobileNavMenu = dynamic(() => import('./MobileNavMenu'), { ssr: false });

function getMobileTitle(pathname: string): string {
    const navRoutes = getNavRoutes();
    const match = navRoutes.find(r => pathname === r.href || pathname.startsWith(`${r.href}/`));
    if (match?.mobileTitle) return match.mobileTitle;
    if (pathname.startsWith('/jobs/')) return 'Job';
    if (pathname.startsWith('/internships/')) return 'Internship';
    if (pathname.startsWith('/walk-ins/')) return 'Walk-in';
    if (pathname.startsWith('/opportunities/')) return 'Opportunity';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/alerts' || pathname === '/account/alerts') return 'Alerts';
    if (pathname === '/feedback') return 'Feedback';
    return 'FresherFlow';
}

export function MobileTopNav() {
    const pathname = usePathname();
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';
    const isCandidatePortfolioRoute = pathname.startsWith('/u/');
    const { unreadCount } = useUnreadNotifications();
    const context = useContext(AuthContext);
    const user = context?.user;
    const [isMounted, setIsMounted] = useState(false);
    const resolvedUser = isMounted ? user : null;
    const pendingSyncCount = useOfflineActionQueue(isMounted ? user?.id : undefined);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const mobileTitle = getMobileTitle(pathname);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [menuOpen]);

    return (
        <>
                <header
                    className={cn(
                        "md:hidden fixed top-0 left-0 right-0 z-70 flex items-center pt-[env(safe-area-inset-top)] transition-all duration-300",
                        scrolled
                            ? "bg-background/95 backdrop-blur-md shadow-sm"
                            : "bg-background"
                    )}
                style={{ height: `calc(3.5rem + env(safe-area-inset-top))` }}
            >
                <div className="w-full flex items-center justify-between px-4 h-full">
                    {/* Brand */}
                    <Link
                        href={resolvedUser && !isAuthRoute ? '/dashboard' : '/'}
                        onClick={(event) => {
                            const targetHref = resolvedUser && !isAuthRoute ? '/dashboard' : '/';
                            if (pathname === targetHref) event.preventDefault();
                        }}
                        className="flex items-center gap-2 min-w-0 active:scale-[0.97] transition-transform duration-150 ease-out"
                    >
                        <LogoImage width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                        <span className="text-[16px] font-semibold tracking-[0.01em] text-foreground/95 truncate leading-none">
                            {mobileTitle}
                        </span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {isCandidatePortfolioRoute ? (
                            <div className="flex items-center gap-2">
                                {resolvedUser ? (
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        href="/register"
                                        className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        Create Profile
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                {resolvedUser && !isAuthRoute && (
                                    <AlertsDropdown />
                                )}
                                {!isAuthRoute && (
                                    <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 ease-out active:scale-[0.97]" aria-label="Open menu">
                                        <div className="relative">
                                            <Bars3Icon className="w-5 h-5" />
                                            {resolvedUser && unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-background" />}
                                        </div>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>
 
            {menuOpen && (
                <MobileNavMenu user={user || null} unreadCount={unreadCount} pendingSyncCount={pendingSyncCount} onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
}
