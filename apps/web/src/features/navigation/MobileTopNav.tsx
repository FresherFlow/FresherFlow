'use client';

import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState, Suspense } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from "@/ui/cn";
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { Sheet, SheetContent, SheetTitle } from '@/ui/Sheet';
import { MobileNavTree } from '@/features/navigation/AppSidebar';

import { getNavRoutes } from './routeConfig';

function getMobileTitle(pathname: string): string {
    const navRoutes = getNavRoutes();
    const match = navRoutes.find(r => pathname === r.href || pathname.startsWith(`${r.href}/`));
    if (match?.mobileTitle) return match.mobileTitle;
    if (pathname.startsWith('/admin/discovery')) return 'Discovery Engine';
    if (pathname.startsWith('/admin')) return 'FF Admin';
    if (pathname.startsWith('/jobs/internships')) return 'Internship';
    if (pathname.startsWith('/jobs/walkins') || pathname.startsWith('/jobs/walk-ins')) return 'Walk-in';
    if (pathname.startsWith('/jobs/')) return 'Job';
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
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const mobileTitle = getMobileTitle(pathname);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
                <header
                    className={cn(
                        "lg:hidden fixed top-0 left-0 right-0 z-70 flex items-center pt-4 transition-all duration-300 select-none",
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
                        className="flex items-center gap-2 min-w-0 active:scale-95 transition-transform duration-150 ease-out"
                    >
                        <LogoImage width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                        <span className="text-base font-semibold tracking-wide text-foreground/95 truncate leading-none">
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
                                        className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        href="/register"
                                        className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                                    <button onClick={() => setMenuOpen(true)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 ease-out active:scale-95" aria-label="Open menu">
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
 
            {/* Mobile drawer. Renders MobileNavTree against the shell's single
                SidebarProvider (NavigationWrapper) instead of nesting another
                one, so this trigger actually opens the drawer. */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" nav className="lg:hidden">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <Suspense fallback={null}>
                        <MobileNavTree onNavigate={() => setMenuOpen(false)} />
                    </Suspense>
                </SheetContent>
            </Sheet>
        </>
    );
}
