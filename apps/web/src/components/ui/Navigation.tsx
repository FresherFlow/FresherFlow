'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useContext, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import ArrowRightOnRectangleIcon from '@heroicons/react/24/outline/ArrowRightOnRectangleIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';

import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import { ThemeToggle } from './ThemeToggle';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useOfflineActionQueue } from '@/lib/offline/useOfflineActionQueue';
import { useTheme } from '@/contexts/ThemeContext';

// Dynamically import the full-screen menu — only loaded when user opens it
const MobileNavMenu = dynamic(() => import('./MobileNavMenu'), { ssr: false });

function TelegramBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M12 0C5.371 0 0 5.372 0 12s5.371 12 12 12 12-5.372 12-12S18.629 0 12 0Zm5.861 8.233-1.97 9.294c-.149.657-.538.818-1.088.51l-3.009-2.219-1.451 1.396c-.16.16-.295.295-.603.295l.213-3.049 5.549-5.012c.24-.213-.053-.333-.373-.12L8.27 13.65l-2.957-.922c-.642-.203-.656-.642.135-.949l11.557-4.456c.536-.198 1.006.12.856.91Z" />
        </svg>
    );
}

function LinkedInBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M20.447 20.452h-3.554V14.87c0-1.332-.026-3.046-1.858-3.046-1.86 0-2.145 1.45-2.145 2.95v5.678H9.338V9h3.414v1.561h.049c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126ZM7.114 20.452H3.558V9h3.556v11.452ZM22.225 0H1.771C.792 0 0 .773 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .773 23.2 0 22.222 0h.003Z" />
        </svg>
    );
}

function XBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M18.901 1.153h3.68l-8.04 9.188L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" />
        </svg>
    );
}

function InstagramBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M7.75 2h8.5A5.756 5.756 0 0 1 22 7.75v8.5A5.756 5.756 0 0 1 16.25 22h-8.5A5.756 5.756 0 0 1 2 16.25v-8.5A5.756 5.756 0 0 1 7.75 2Zm-.25 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.75 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        </svg>
    );
}

function FacebookBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.412c0-3.022 1.792-4.694 4.533-4.694 1.313 0 2.687.236 2.687.236v2.969H15.83c-1.491 0-1.956.928-1.956 1.881v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
        </svg>
    );
}

function WhatsAppBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .14 5.34.14 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.63a11.84 11.84 0 0 0 5.81 1.49h.01c6.57 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.17-3.48-8.45ZM12.07 21.8h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.84 9.84 0 0 1-1.5-5.26c0-5.44 4.42-9.87 9.86-9.87 2.63 0 5.1 1.02 6.96 2.9a9.78 9.78 0 0 1 2.89 6.97c0 5.44-4.42 9.88-9.85 9.88Zm5.42-7.41c-.3-.15-1.79-.88-2.07-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.48a8.96 8.96 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.25-.6-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.5s1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.08 4.48.71.3 1.27.48 1.7.61.72.23 1.38.2 1.89.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
        </svg>
    );
}

const SOCIAL_LINKS = [
    { href: 'https://t.me/fresherflowin', label: 'Telegram', icon: TelegramBrandIcon },
    { href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D', label: 'WhatsApp', icon: WhatsAppBrandIcon },
    { href: 'https://www.linkedin.com/company/fresherflow-in', label: 'LinkedIn', icon: LinkedInBrandIcon },
    { href: 'https://twitter.com/Fresherflow', label: 'Twitter', icon: XBrandIcon },
    { href: 'https://instagram.com/fresherflow', label: 'Instagram', icon: InstagramBrandIcon },
    { href: 'https://www.facebook.com/FresherFlow.in', label: 'Facebook', icon: FacebookBrandIcon },
] as const;

export function Navbar() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const isLoading = context?.isLoading;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { unreadCount } = useUnreadNotifications();
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const { theme } = useTheme();
    const logoSrc = theme === 'dark' ? '/logo-white-optimized.png' : '/logo-optimized.png';

    const navLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/opportunities', label: 'Search' },
        { href: '/jobs', label: 'Jobs' },
        { href: '/internships', label: 'Internships' },
        { href: '/walk-ins', label: 'Walk-ins' },
        { href: '/account/tracker', label: 'Tracker' },
        { href: '/account/saved', label: 'Saved' },
    ];

    return (
        <>
            <nav suppressHydrationWarning
                className="fixed top-0 left-0 right-0 z-100 border-b bg-card border-border py-2 shadow-sm translate-y-0 opacity-100 hidden md:block"
            >
                <div className="w-full px-4 md:px-6 max-w-7xl mx-auto flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-1 group shrink-0" suppressHydrationWarning>
                            <div className="w-8 h-8 relative flex items-center justify-center transition-all duration-300 transform group-hover:scale-110">
                                <Image
                                    src={logoSrc}
                                    alt="FresherFlow"
                                    width={32}
                                    height={32}
                                    priority
                                    className="w-8 h-8 object-contain"
                                />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-foreground" suppressHydrationWarning>FresherFlow</span>
                        </Link>
                    </div>

                    {/* Desktop Nav Links */}
                    {!isLoading && user && (
                        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                            {navLinks.map((link) => {
                                const currentSearchParams = searchParams.toString();
                                const fullPath = pathname + (currentSearchParams ? `?${currentSearchParams}` : '');
                                const isActive = fullPath === link.href || pathname === link.href;

                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded ${isActive
                                            ? 'bg-background text-primary border border-border shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />
                        {!isLoading && user && pendingSyncCount > 0 && (
                            <span className="hidden md:inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                {pendingSyncCount} pending
                            </span>
                        )}


                        {!isLoading && (
                            <>
                                {user ? (
                                    <div className="flex items-center gap-1 md:gap-3">
                                        <div className="h-4 w-px bg-border mx-1 hidden md:block" />

                                        <Link href="/alerts" className="p-2 text-muted-foreground hover:text-primary transition-colors hidden md:block relative">
                                            <BellIcon className="w-5 h-5" />
                                            {unreadCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
                                            )}
                                        </Link>

                                        <Link href="/profile" className="p-2 text-muted-foreground hover:text-primary transition-colors hidden md:block">
                                            <UserIcon className="w-5 h-5" />
                                        </Link>


                                        <Link
                                            href="/logout"
                                            className="p-2 text-muted-foreground hover:text-error transition-colors hidden md:block"
                                            title="Logout"
                                        >
                                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                        </Link>

                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Link href="/login" className="hidden md:flex premium-button !h-8 !px-5 !text-[10px] uppercase tracking-widest italic">
                                            Access Feed
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}

export function MobileNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { unreadCount } = useUnreadNotifications();
    const context = useContext(AuthContext);
    const user = context?.user;
    const isLoading = context?.isLoading;
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [isVisible, setIsVisible] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const { theme } = useTheme();
    const logoSrc = theme === 'dark' ? '/logo-white-optimized.png' : '/logo-optimized.png';
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);

    useEffect(() => {
        if (isLoading || !user) return;
        const handleScroll = () => {
            if (tickingRef.current) return;
            tickingRef.current = true;

            requestAnimationFrame(() => {
                const currentY = window.scrollY;
                const delta = currentY - lastScrollYRef.current;

                if (currentY < 64) {
                    setIsVisible(true);
                } else if (delta > 6) {
                    setIsVisible(false);
                } else if (delta < -6) {
                    setIsVisible(true);
                }

                lastScrollYRef.current = currentY;
                tickingRef.current = false;
            });
        };

        lastScrollYRef.current = window.scrollY;
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoading, user]);

    useEffect(() => {
        if (!menuOpen) return;
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [menuOpen]);

    const getMobileTitle = (path: string) => {
        if (path === '/dashboard') return 'FresherFlow';
        if (path === '/opportunities') return 'Search';
        if (path === '/jobs') return 'Jobs';
        if (path === '/internships') return 'Internships';
        if (path === '/walk-ins') return 'Walk-ins';
        if (path.startsWith('/jobs/')) return 'Job';
        if (path.startsWith('/internships/')) return 'Internship';
        if (path.startsWith('/walk-ins/')) return 'Walk-in';
        if (path === '/account/saved') return 'Saved';
        if (path === '/account/tracker') return 'Tracker';
        if (path === '/profile') return 'Profile';
        if (path === '/alerts' || path === '/account/alerts') return 'Alerts';
        if (path === '/account/feedback') return 'Feedback';
        if (path.startsWith('/opportunities/')) return 'Opportunity';
        return 'FresherFlow';
    };

    const mobileTitle = getMobileTitle(pathname);

    const tabs = [
        { href: '/dashboard', label: 'Home', icon: HomeIcon },
        { href: '/opportunities', label: 'Search', icon: MagnifyingGlassIcon },
        { href: '/jobs', label: 'Jobs', icon: BriefcaseIcon },
        { href: '/internships', label: 'Internships', icon: AcademicCapIcon },
        { href: '/walk-ins', label: 'Walk-ins', icon: BriefcaseIcon },
    ];

    return (
        <>
            <div className="hidden lg:flex fixed right-3 top-1/2 -translate-y-1/2 z-[65] flex-col gap-1.5 rounded-xl border border-border bg-card/95 backdrop-blur px-1.5 py-2 shadow-sm">
                {SOCIAL_LINKS.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40"
                        aria-label={item.label}
                    >
                        <item.icon className="w-4 h-4" />
                    </a>
                ))}
            </div>
            <div className="md:hidden fixed top-0 left-0 right-0 z-[70] h-16 bg-background border-b border-border">
                <div className="h-full px-4 flex items-center justify-between">
                    <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
                        <Image
                            src={logoSrc}
                            alt="FresherFlow"
                            width={24}
                            height={24}
                            priority
                            className="w-6 h-6 object-contain"
                        />
                        <span className="text-base font-bold tracking-tight text-foreground">{mobileTitle}</span>
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2">
                            {pathname.startsWith('/jobs/') || pathname.startsWith('/internships/') || pathname.startsWith('/walk-ins/') || pathname.startsWith('/opportunities/') ? (
                                <button
                                    onClick={() => window.history.length > 1 ? history.back() : window.location.assign('/opportunities')}
                                    className="p-2 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-primary transition-all"
                                    aria-label="Go back"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                            ) : null}
                            <Link
                                href="/alerts"
                                className="p-2 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-primary transition-all relative"
                                aria-label="View notifications"
                            >
                                <BellIcon className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
                                )}
                                {pendingSyncCount > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white leading-[14px] text-center">
                                        {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                                    </span>
                                )}
                            </Link>
                            <button
                                onClick={() => setMenuOpen(true)}
                                className={cn(
                                    "p-2 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
                                    menuOpen && "text-primary border-primary/30 bg-primary/10"
                                )}
                                aria-label="Open menu"
                            >
                                <div className="relative">
                                    <Bars3Icon className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-background" />
                                    )}
                                </div>
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="premium-button !h-8 !px-4 !text-[10px] uppercase font-bold tracking-widest italic">
                            Login
                        </Link>
                    )}
                </div>
            </div>
            {user && menuOpen && (
                <MobileNavMenu
                    user={user}
                    unreadCount={unreadCount}
                    pendingSyncCount={pendingSyncCount}
                    onClose={() => setMenuOpen(false)}
                />
            )}
            {user && (
                <div className={cn(
                    "md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border z-50 transition-transform duration-200",
                    isVisible ? "translate-y-0" : "translate-y-full"
                )}>
                    <div className="flex justify-around items-center h-full px-0">
                        {tabs.map((tab) => {
                            const currentSearchParams = searchParams.toString();
                            const fullPath = pathname + (currentSearchParams ? `?${currentSearchParams}` : '');
                            const [tabPath, tabQuery] = tab.href.split('?');
                            const currentView = searchParams.get('view');
                            const tabView = tabQuery ? new URLSearchParams(tabQuery).get('view') : null;
                            const isActive = fullPath === tab.href
                                || (pathname === tabPath && ((tabView && currentView === tabView) || (!tabView && currentView !== 'new')));

                            return (
                                <Link
                                    key={tab.href + tab.label}
                                    href={tab.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 h-full gap-1",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <div className={cn(
                                        "p-1 rounded-xl",
                                        isActive && "bg-primary/10"
                                    )}>
                                        <tab.icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2 : 1.5} />
                                    </div>
                                    <span className={cn(
                                        "text-[11px]",
                                        isActive ? "font-semibold" : "font-normal"
                                    )}>
                                        {tab.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
