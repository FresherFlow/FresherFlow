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
    const { unreadCount } = useUnreadNotifications();
    const context = useContext(AuthContext);
    const user = context?.user;
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

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
                    <div className="flex items-center gap-1 shrink-0">
                        {user && (
                            <Link href="/alerts" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Notifications">
                                <BellIcon className="w-5 h-5" />
                                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />}
                                {pendingSyncCount > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-3.5 h-3.5 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white leading-3.5 text-center">
                                        {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Open menu">
                            <div className="relative">
                                <Bars3Icon className="w-5 h-5" />
                                {user && unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-background" />}
                            </div>
                        </button>
                    </div>
                </div>
            </header>
 
            {menuOpen && (
                <MobileNavMenu user={user || null} unreadCount={unreadCount} pendingSyncCount={pendingSyncCount} onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
}
