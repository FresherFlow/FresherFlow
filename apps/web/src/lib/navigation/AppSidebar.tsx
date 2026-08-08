'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { LogoImage } from './LogoImage';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Hint } from '@/ui/Tooltip';
import {
    HomeIcon,
    BriefcaseIcon,
    BuildingLibraryIcon,
    BuildingOfficeIcon,
    BookmarkIcon,
    UserCircleIcon,
    AcademicCapIcon,
    ComputerDesktopIcon,
    UserGroupIcon,
    ClockIcon,
    FireIcon,
    MapIcon,
    DocumentCheckIcon,
    IdentificationIcon,
    BanknotesIcon,
    TruckIcon,
    ShieldCheckIcon,
    Cog6ToothIcon,
    LinkIcon,
    Bars3Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

const SidebarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
);
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/ui/Sheet';

const DEFAULT_NAV_ITEMS = [
    { name: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
    { name: 'Government', href: '/govt', icon: BuildingLibraryIcon, hasSubmenu: true },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Bookmarks', href: '/saved', icon: BookmarkIcon },
    { name: 'Account', href: '/account', icon: UserCircleIcon },
];

const JOBS_NAV_ITEMS = [
    { name: 'All Jobs', href: '/jobs', icon: BriefcaseIcon },
    { name: 'Internships', href: '/jobs?type=internship', icon: AcademicCapIcon },
    { name: 'Remote', href: '/jobs?mode=remote', icon: ComputerDesktopIcon },
    { name: 'Walk-ins', href: '/jobs?type=walkin', icon: UserGroupIcon },
    { name: 'Off-campus', href: '/jobs?source=offcampus', icon: MapIcon },
    { name: 'Latest', href: '/jobs?sort=latest', icon: ClockIcon },
    { name: 'Trending', href: '/jobs?sort=trending', icon: FireIcon },
    { name: 'Skills', href: '/skills', icon: SparklesIcon },
    { name: 'Roles', href: '/roles', icon: IdentificationIcon },
    { name: 'Location', href: '/locations', icon: MapIcon },
    { name: 'Company', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Batch', href: '/batch', icon: AcademicCapIcon },
];

const GOVT_NAV_ITEMS = [
    { name: 'All', href: '/govt', icon: ClockIcon },
    { name: 'UPSC', href: '/govt?category=UPSC', icon: BuildingLibraryIcon },
    { name: 'SSC', href: '/govt?category=SSC', icon: BuildingLibraryIcon },
    { name: 'Banking', href: '/govt?category=Banking', icon: BanknotesIcon },
    { name: 'Railways', href: '/govt?category=Railways', icon: TruckIcon },
    { name: 'PSU', href: '/govt?category=State PSC', icon: BuildingLibraryIcon },
    { name: 'Defence', href: '/govt?category=Defence', icon: ShieldCheckIcon },
    { name: 'Teaching', href: '/govt?category=Teaching', icon: AcademicCapIcon },
    { name: 'Police', href: '/govt?category=Police', icon: ShieldCheckIcon },
    { name: 'Engineering', href: '/govt?category=Engineering', icon: DocumentCheckIcon },
];

const ACCOUNT_NAV_ITEMS = [
    { name: 'Account', href: '/account', icon: UsersIcon },
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Tracker', href: '/tracker', icon: BriefcaseIcon },
    { name: 'Saved', href: '/saved', icon: BookmarkIcon },
    { name: 'Following', href: '/followed-companies', icon: BuildingOfficeIcon },
    { name: 'Referrals', href: '/referral', icon: UserGroupIcon },
    { name: 'Contributions', href: '/contribute', icon: LinkIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

interface SidebarContentProps {
    pathname: string;
    searchParams?: URLSearchParams | null;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

function SidebarContent({ pathname, searchParams, collapsed, onToggleCollapse }: SidebarContentProps) {
    const homeHref = '/dashboard';
    const logoHref = '/dashboard';

    let context = 'default';
    if (
        pathname.startsWith('/account') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/tracker') ||
        pathname.startsWith('/alerts') ||
        pathname.startsWith('/notifications') ||
        pathname.startsWith('/followed-companies') ||
        pathname.startsWith('/referral') ||
        pathname.startsWith('/contribute') ||
        pathname.startsWith('/saved')
    ) {
        context = 'account';
    } else if (pathname.startsWith('/govt')) {
        context = 'government';
    } else if (
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/off-campus') ||
        pathname.startsWith('/skills') ||
        pathname.startsWith('/roles') ||
        pathname.startsWith('/locations') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/batch')
    ) {
        context = 'jobs';
    }

    const isSubContext = context !== 'default';
    const depth = isSubContext ? 1 : 0;
    const [prevDepth, setPrevDepth] = useState(depth);
    
    let direction = 0;
    if (depth > prevDepth) direction = 1;
    else if (depth < prevDepth) direction = -1;
    
    if (depth !== prevDepth) {
        setPrevDepth(depth);
    }

    const headerTitle = context === 'account' ? 'Account' : context === 'government' ? 'Government' : 'Jobs';
    const baseNavItems = context === 'account' ? ACCOUNT_NAV_ITEMS : context === 'government' ? GOVT_NAV_ITEMS : context === 'jobs' ? JOBS_NAV_ITEMS : DEFAULT_NAV_ITEMS;
    const navItems = baseNavItems.map(item => item.name === 'Home' ? { ...item, href: homeHref } : item);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 16 : direction < 0 ? -16 : 0,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const }
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 16 : direction > 0 ? -16 : 0,
            opacity: 0,
            transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const }
        })
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col h-full bg-card border-r border-border pb-4 w-full select-none">
                {/* 1. FIXED LOGO HEADER
                    - px-[8px] left/right padding: 8+28+8=44px < 48px collapsed width, so icon never touches the border
                    - Text is clipped naturally by the aside overflow-hidden as sidebar width shrinks — no separate opacity animation needed */}
                <div className="h-14 flex items-center px-[8px] border-b border-border mb-4 bg-card shrink-0">
                    <Link href={logoHref} className="flex items-center gap-2 w-full min-w-0 hover:opacity-80 transition-opacity focus:outline-none">
                        <LogoImage width={28} height={28} className="w-7 h-7 object-contain shrink-0" />
                        <span className={cn("text-lg font-bold text-foreground whitespace-nowrap sidebar-expanded-only", collapsed && "hidden")}>FresherFlow</span>
                    </Link>
                </div>

                {/* 2. SCROLLABLE NAV AREA */}
                <div className="flex-1 overflow-y-auto px-2 custom-scrollbar no-scrollbar relative overflow-x-hidden">
                    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.div 
                            key={context} 
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="space-y-1 w-full"
                        >
                            {/* BACK BUTTON — same structure collapsed/expanded, icon always at same x */}
                            {isSubContext && (() => {
                                const backLink = (
                                    <Link
                                        href={homeHref}
                                        className="relative flex items-center gap-2 py-2 px-1.5 h-9 w-full rounded-md text-sm transition-colors focus:outline-none text-muted-foreground hover:bg-muted/50 hover:text-foreground overflow-hidden"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4 shrink-0" />
                                        <span className={cn("truncate whitespace-nowrap sidebar-expanded-only", collapsed && "hidden")}>{headerTitle}</span>
                                    </Link>
                                );
                                return collapsed ? (
                                    <Hint label={headerTitle} side="right">{backLink}</Hint>
                                ) : backLink;
                            })()}

                            {/* NAV ITEMS LIST */}
                            <div className="select-none flex flex-col gap-1 w-full">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const [itemPath, itemQuery] = item.href.split('?');
                                let isActive = false;
                                
                                if (itemQuery) {
                                    const itemParams = new URLSearchParams(itemQuery);
                                    let match = true;
                                    itemParams.forEach((val, key) => {
                                        if (searchParams?.get(key) !== val) match = false;
                                    });
                                    isActive = pathname === itemPath && match;
                                } else if (item.href === '/jobs') {
                                    isActive = pathname === '/jobs' && !searchParams?.get('type') && !searchParams?.get('mode') && !searchParams?.get('source') && !searchParams?.get('sort') && !searchParams?.get('filter');
                                } else {
                                    isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                }
                                
                                // Always px-1.5 so icon left edge never shifts between states
                                const linkElement = (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "relative flex items-center gap-2 py-2 px-1.5 w-full h-9 rounded-md text-sm transition-colors focus:outline-none overflow-hidden",
                                            isActive
                                                ? 'bg-muted/60 text-foreground font-semibold'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 shrink-0 transition-all", isActive && "stroke-2")} />
                                        <span className={cn("truncate whitespace-nowrap sidebar-expanded-only", collapsed && "hidden")}>{item.name}</span>
                                        {Boolean('hasSubmenu' in item && item.hasSubmenu) && !collapsed && (
                                            <ChevronRightIcon className="w-4 h-4 ml-auto text-muted-foreground/50 shrink-0" />
                                        )}
                                        {isActive && !collapsed && (
                                            <motion.div
                                                layoutId="sidebar-active"
                                                className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-foreground"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                );

                                // Show Hint tooltip only when collapsed (icon-only mode)
                                return collapsed ? (
                                    <Hint key={item.name} label={item.name} side="right">
                                        {linkElement}
                                    </Hint>
                                ) : (
                                    <React.Fragment key={item.name}>
                                        {linkElement}
                                    </React.Fragment>
                                );
                            })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* 3. FOOTER — Collapse toggle button
                    - When expanded: "Collapse  Ctrl+B" left-aligned
                    - When collapsed: icon only, centered, tooltip shows Ctrl+B hint
                    - Tooltip only enabled when collapsed */}
                {onToggleCollapse && (
                    <div className="px-1 pb-1 mt-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleCollapse}
                                    className="w-full flex items-center gap-2 px-1.5 rounded-md h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-label="Toggle Sidebar"
                                >
                                    <SidebarIcon className="w-5 h-5 shrink-0" />
                                    <span className={cn("text-sm whitespace-nowrap text-left sidebar-expanded-only", collapsed && "hidden")}>Collapse</span>
                                    {!collapsed && (
                                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded border border-border shrink-0">Ctrl+B</span>
                                    )}
                                </button>
                            </TooltipTrigger>
                            {/* Only show tooltip when collapsed — when expanded the label is visible */}
                            {collapsed && (
                                <TooltipContent side="right" className="flex items-center gap-2">
                                    <span>Expand Sidebar</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded border border-border">Ctrl+B</span>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

export function AppSidebar() {
    const rawPathname = usePathname();
    const pathname = rawPathname || '';
    const searchParams = useSearchParams();
    const { theme, toggleTheme } = useTheme();
    
    const [collapsed, setCollapsed] = useState(false);
    const handleToggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('ff:sidebarCollapsed', String(next));
            document.documentElement.style.setProperty('--sidebar-w', next ? '3rem' : '12rem');
            document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
            return next;
        });
    };

    // Sync CSS var on mount
    useEffect(() => {
        const stored = localStorage.getItem('ff:sidebarCollapsed');
        const isCol = stored === 'true';
        if (isCol) setCollapsed(true);
        document.documentElement.style.setProperty('--sidebar-w', isCol ? '3rem' : '12rem');
        document.documentElement.setAttribute('data-sidebar', isCol ? 'collapsed' : 'expanded');
    }, []);

    // Ctrl+B shortcut to toggle sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                handleToggleCollapse();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const logoHref = '/';

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-[var(--sidebar-w,12rem)] transition-[width] duration-200 ease-in-out overflow-hidden">
                <SidebarContent pathname={pathname} searchParams={searchParams} collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
            </aside>

            {/* Mobile Nav Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
                <Link href={logoHref} className="flex items-center gap-2">
                    <LogoImage width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                    <span className="text-base font-bold text-foreground">FresherFlow</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="p-2 -mr-2 text-foreground active:scale-95 transition-transform" aria-label="Open Navigation">
                                <Bars3Icon className="w-6 h-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <SheetDescription className="sr-only">Access opportunities, saved jobs, and settings.</SheetDescription>
                            <SidebarContent pathname={pathname} searchParams={searchParams} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    );
}

