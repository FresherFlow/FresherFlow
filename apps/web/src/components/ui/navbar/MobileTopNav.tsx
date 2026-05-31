'use client';

import Link from 'next/link';
import { LogoImage } from './LogoImage';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { useOfflineActionQueue } from '@/lib/offline/useOfflineActionQueue';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';
import { getNavRoutes } from './routeConfig';
import { useSiteMode } from '@/contexts/SiteModeContext';

const MobileNavMenu = dynamic(() => import('../MobileNavMenu'), { ssr: false });

function getMobileTitle(pathname: string, mode: "private" | "govt"): string {
    const navRoutes = getNavRoutes(mode);
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
    const { unreadCount } = useUnreadNotifications();
    const context = useContext(AuthContext);
    const user = context?.user;
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { canInstall, promptInstall } = useInstallPrompt();
    const { mode } = useSiteMode();
    const mobileTitle = getMobileTitle(pathname, mode);

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
                    "md:hidden fixed top-0 left-0 right-0 z-70 flex items-center pt-[env(safe-area-inset-top)] transition-all duration-300 border-b",
                    scrolled
                        ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
                        : "bg-background border-transparent"
                )}
                style={{ height: `calc(3.5rem + env(safe-area-inset-top))` }}
            >
                <div className="w-full flex items-center justify-between px-4 h-full">
                    {/* Brand */}
                    <Link
                        href={user ? '/dashboard' : '/'}
                        onClick={(event) => {
                            const targetHref = user ? '/dashboard' : '/';
                            if (pathname === targetHref) event.preventDefault();
                        }}
                        className="flex items-center gap-2 min-w-0"
                    >
                        <LogoImage width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                        <span className="text-[16px] font-semibold tracking-[0.01em] text-foreground/95 truncate leading-none">
                            {mobileTitle}
                        </span>
                    </Link>

                    {/* Right Actions */}
                    {user ? (
                        <div className="flex items-center gap-1 shrink-0">

                            {canInstall && (
                                <button type="button" onClick={() => void promptInstall('navbar')} className="px-2 py-1 rounded-lg border border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary" aria-label="Install app">
                                    Install
                                </button>
                            )}
                            <Link href="/alerts" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Notifications">
                                <BellIcon className="w-5 h-5" />
                                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />}
                                {pendingSyncCount > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-3.5 h-3.5 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white leading-3.5 text-center">
                                        {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                                    </span>
                                )}
                            </Link>
                            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Open menu">
                                <div className="relative">
                                    <Bars3Icon className="w-5 h-5" />
                                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-background" />}
                                </div>
                            </button>
                        </div>
                    ) : pathname !== '/download' ? (
                        <Link
                            href="/download"
                            target="_self"
                            onClick={(event) => {
                                if (pathname === '/download') event.preventDefault();
                            }}
                            className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-85 transition-all shadow-sm shrink-0"
                        >
                            Get App
                        </Link>
                    ) : null}
                </div>
            </header>

            {user && menuOpen && (
                <MobileNavMenu user={user} unreadCount={unreadCount} pendingSyncCount={pendingSyncCount} onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
}
