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
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useOfflineActionQueue } from '@/lib/offline/useOfflineActionQueue';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';
import { NAV_ROUTES } from './routeConfig';

const MobileNavMenu = dynamic(() => import('../MobileNavMenu'), { ssr: false });

function getMobileTitle(pathname: string): string {
    const match = NAV_ROUTES.find(r => pathname === r.href || pathname.startsWith(`${r.href}/`));
    if (match?.mobileTitle) return match.mobileTitle;
    if (pathname.startsWith('/jobs/')) return 'Job';
    if (pathname.startsWith('/internships/')) return 'Internship';
    if (pathname.startsWith('/walk-ins/')) return 'Walk-in';
    if (pathname.startsWith('/opportunities/')) return 'Opportunity';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/alerts' || pathname === '/account/alerts') return 'Alerts';
    if (pathname === '/account/feedback') return 'Feedback';
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
                className="md:hidden fixed top-0 left-0 right-0 z-[70] flex items-end justify-center pb-1.5 pt-[env(safe-area-inset-top)] pointer-events-none"
                style={{ height: `calc(3.75rem + env(safe-area-inset-top))` }}
            >
                <div className={cn(
                    'pointer-events-auto w-[calc(100%-24px)] flex items-center justify-between gap-3 rounded-2xl px-4 h-12 transition-all duration-300',
                    scrolled
                        ? 'border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.97)] shadow-sm'
                        : 'border border-transparent bg-transparent shadow-none'
                )}>
                    {/* Brand */}
                    <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 min-w-0">
                        <LogoImage width={22} height={22} className="w-[22px] h-[22px] object-contain shrink-0" />
                        <span className="text-[14px] font-semibold tracking-[0.02em] text-foreground/90 truncate leading-none">
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
                                <BellIcon className="w-[18px] h-[18px]" />
                                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />}
                                {pendingSyncCount > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white leading-[14px] text-center">
                                        {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                                    </span>
                                )}
                            </Link>
                            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Open menu">
                                <div className="relative">
                                    <Bars3Icon className="w-[18px] h-[18px]" />
                                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-background" />}
                                </div>
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="inline-flex items-center h-8 px-3.5 rounded-lg bg-foreground text-background text-[11px] font-semibold hover:opacity-85 transition-all shadow-sm shrink-0">
                            Sign in
                        </Link>
                    )}
                </div>
            </header>

            {user && menuOpen && (
                <MobileNavMenu user={user} unreadCount={unreadCount} pendingSyncCount={pendingSyncCount} onClose={() => setMenuOpen(false)} />
            )}
        </>
    );
}
