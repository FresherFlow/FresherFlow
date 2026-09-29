'use client';

import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { usePathname, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState, Suspense } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { cn } from "@/ui/cn";
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { useAdminPalette } from '@/features/admin/layout/AdminPaletteProvider';
import { NotificationsDropdown } from '@/features/notifications/components/NotificationsDropdown';
import { Sheet, SheetContent, SheetTitle } from '@/ui/Sheet';
import { useTheme } from '@/lib/providers/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { MobileNavTree } from '@/features/navigation/AppSidebar';
import { AdminMobileNavTree } from '@/features/admin/layout/AdminSidebar';

import { getNavRoutes, isSidebarPage } from './routeConfig';
import { getAdminTitle } from './headerContent';

function getMobileTitle(pathname: string): string {
    const navRoutes = getNavRoutes();
    const match = navRoutes.find(r => pathname === r.href || pathname.startsWith(`${r.href}/`));
    if (match?.mobileTitle) return match.mobileTitle;
    if (pathname.startsWith('/admin/discovery')) return 'Discovery Engine';
    if (pathname.startsWith('/admin')) return 'FF Admin';
    if (pathname.startsWith('/jobs/internships')) return 'Internship';
    if (pathname.startsWith('/drives/walk-in') || pathname.startsWith('/jobs/walk-ins')) return 'Walk-in';
    if (pathname.startsWith('/jobs/')) return 'Job';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/alerts' || pathname === '/account/alerts') return 'Alerts';
    if (pathname === '/feedback') return 'Feedback';
    return 'FresherFlow';
}

/** /jobs tab labels, mirroring the desktop trail (JobsPageClient USER_TABS). */
const JOBS_TAB_TITLES: Record<string, string> = {
    'for-you': 'For You',
    saved: 'Saved',
    applied: 'Applied',
    alerts: 'Alerts',
    following: 'Following',
    notifications: 'Notifications',
    searches: 'Searches',
};

function AdminMobileSearchButton() {
    const palette = useAdminPalette();
    if (!palette) return null;
    return (
        <button
            type="button"
            onClick={palette.openPalette}
            aria-label="Search admin"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 ease-out active:scale-95"
        >
            <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
    );
}

export function MobileTopNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';
    const isCandidatePortfolioRoute = pathname.startsWith('/u/');
    // Sidebar pages keep the notification bell in the mobile header; public
    // pages (home, /u) never show it.
    const isSidebarRoute = isSidebarPage(pathname || '');
    const context = useContext(AuthContext);
    const user = context?.user;
    const [isMounted, setIsMounted] = useState(false);
    const resolvedUser = isMounted ? user : null;
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { resolvedTheme, toggleTheme } = useTheme();

    useEffect(() => { setIsMounted(true); }, []);

    const mobileTitle = getMobileTitle(pathname);
    // /jobs is one page with ?tab= workspaces: the header must name the tab
    // (Applied, Saved, â€¦), not the section. The in-page breadcrumb trail is
    // desktop-only, so this is the mobile user's only page label.
    const jobsTab = pathname === '/jobs' ? searchParams?.get('tab') : null;
    const headerTitle = (jobsTab && JOBS_TAB_TITLES[jobsTab]) || mobileTitle;
    const isAdminRoute = (pathname || '').startsWith('/admin');
    const adminPage = isAdminRoute
        ? getAdminTitle((pathname || '').split('/').filter(Boolean))
        : '';

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
                        href={resolvedUser && !isAuthRoute ? '/jobs?tab=for-you' : '/'}
                        onClick={(event) => {
                            const targetHref = resolvedUser && !isAuthRoute ? '/jobs?tab=for-you' : '/';
                            if (pathname === targetHref) event.preventDefault();
                        }}
                        className="flex items-center gap-2 min-w-0 active:scale-95 transition-transform duration-150 ease-out"
                    >
                        <LogoImage width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                        <span className="text-base font-semibold tracking-wide text-foreground/95 truncate leading-none">
                            {isAdminRoute && adminPage ? adminPage : headerTitle}
                        </span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {(pathname || '').startsWith('/admin') && <AdminMobileSearchButton />}
                        {isCandidatePortfolioRoute ? (
                            <div className="flex items-center gap-2">
                                {resolvedUser ? (
                                    <Link
                                        href="/jobs?tab=for-you"
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
                                {resolvedUser && !isAuthRoute && isSidebarRoute && (
                                    <NotificationsDropdown />
                                )}
                                {!isAuthRoute && (
                                    <button onClick={() => setMenuOpen(true)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 ease-out active:scale-95" aria-label="Open menu">
                                        <Bars3Icon className="w-5 h-5" />
                                    </button>
                                )}
                                {isAuthRoute && (
                                    <button
                                        onClick={() => void toggleTheme()}
                                        aria-label="Toggle theme"
                                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors duration-200 outline-none active:scale-95"
                                    >
                                        <span className="relative flex h-5 w-5 items-center justify-center">
                                            {/* Mount-gated: resolvedTheme differs between SSR and
                                                the client (stored preference), so rendering the
                                                icons immediately causes a hydration mismatch. */}
                                            {isMounted && (
                                                <>
                                                    <Sun className={`absolute transition-all duration-300 ${resolvedTheme === 'dark' ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} size={18} />
                                                    <Moon className={`absolute transition-all duration-300 ${resolvedTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} size={18} />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile drawer. Owns its OWN local `menuOpen` state (the trigger
                above sets it directly) instead of the sidebar provider's
                `openMobile`. The rail is wrapped in `hidden lg:block`, so
                `display:none` does not unmount it and the primitive's own
                mobile Sheet still portals to <body> â€” binding both to one
                shared state opened two overlays per tap, and their exit
                animations raced the body scroll lock, which is the hang. */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" nav className="lg:hidden" data-nav-drawer="">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <Suspense fallback={null}>
                        {isAdminRoute ? (
                            <AdminMobileNavTree onNavigate={() => setMenuOpen(false)} />
                        ) : (
                            <MobileNavTree onNavigate={() => setMenuOpen(false)} />
                        )}
                    </Suspense>
                </SheetContent>
            </Sheet>
        </>
    );
}
