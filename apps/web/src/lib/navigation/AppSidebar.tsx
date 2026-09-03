'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { LogoImage } from './LogoImage';
import { useTheme } from '@/lib/providers/ThemeContext';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Hint } from '@/ui/Tooltip';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Sun, Moon } from 'lucide-react';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';


const SidebarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
);


import { DEFAULT_NAV_ITEMS, JOBS_NAV_ITEMS, GOVT_NAV_ITEMS, ACCOUNT_NAV_ITEMS } from './navConfig';
import { useAuth } from '@/lib/auth/AuthContext';

interface SidebarContentProps {
    pathname: string;
    searchParams?: URLSearchParams | null;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    hostname?: string;
    customNavItems?: any[];
    customHeaderTitle?: string;
    showThemeToggle?: boolean;
    forceSubContext?: boolean;
    customHomeHref?: string;
}

export function SidebarContent({ pathname, searchParams, collapsed, onToggleCollapse, hostname, customNavItems, customHeaderTitle, showThemeToggle, forceSubContext, customHomeHref }: SidebarContentProps) {
    const isAppHost = hostname?.startsWith('app.') || hostname === 'localhost' || hostname?.startsWith('127.');
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const homeHref = customHomeHref || (isAppHost ? '/dashboard' : '/');
    const logoHref = homeHref;

    const [prevContext, setPrevContext] = useState('default');
    let context = 'default';

    const sharedPaths = ['/companies', '/saved', '/tracker', '/resources', '/submit'];
    const isShared = sharedPaths.some(p => pathname.startsWith(p));

    if (
        pathname.startsWith('/account') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/alerts') ||
        pathname.startsWith('/notifications') ||
        pathname.startsWith('/followed-companies') ||
        pathname.startsWith('/referral') ||
        pathname.startsWith('/contribute')
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
        pathname.startsWith('/batch') ||
        pathname.startsWith('/platforms')
    ) {
        context = 'jobs';
    } else if (isShared) {
        context = prevContext;
    }

    const isSubContext = forceSubContext || context !== 'default';

    if (context !== prevContext) {
        setPrevContext(context);
    }

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const isAuthed = mounted ? Boolean(user) : true;

    const headerTitle = customHeaderTitle || (context === 'account' ? 'Account' : context === 'government' ? 'Government' : 'Jobs');
    const baseNavItems = customNavItems || (context === 'account' ? ACCOUNT_NAV_ITEMS : context === 'government' ? GOVT_NAV_ITEMS : context === 'jobs' ? JOBS_NAV_ITEMS : DEFAULT_NAV_ITEMS);
    const navItems = baseNavItems
        .filter(item => !(item.requiresAuth && !isAuthed))
        .map(item => item.name === 'Home' ? { ...item, href: homeHref } : item);

    const variants = {
        enter: {
            x: 0,
            opacity: 0,
        },
        center: {
            x: 0,
            opacity: 1,
            transition: {
                opacity: { duration: 0.12, ease: [0, 0, 0.58, 1] as const },
            },
        },
        exit: {
            x: 0,
            opacity: 0,
            transition: {
                opacity: { duration: 0.12, ease: [0.33, 0, 1, 1] as const },
            },
        },
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col h-full bg-card border-r border-border pb-4 w-full select-none">
                {/* 1. FIXED LOGO HEADER */}
                <div className="h-14 flex items-center px-[8px] border-b border-border mb-4 bg-card shrink-0">
                    <Link href={logoHref} className="flex items-center gap-2 w-full min-w-0 hover:opacity-80 transition-opacity focus:outline-none">
                        <LogoImage width={28} height={28} className="w-7 h-7 object-contain shrink-0" />
                        <span className="text-lg font-bold text-foreground whitespace-nowrap truncate">{headerTitle === 'Admin Portal' ? 'Admin' : 'FresherFlow'}</span>
                    </Link>
                </div>

                {/* 2. SCROLLABLE NAV AREA */}
                <div className="flex-1 overflow-y-auto px-2 custom-scrollbar no-scrollbar relative overflow-x-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={context}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="flex flex-col flex-1 min-h-0 w-full"
                        >
                            {/* BACK BUTTON */}
                            {isSubContext && (() => {
                                const backLink = (
                                    <Link
                                        href={homeHref}
                                        className="relative flex items-center gap-1.5 py-2 px-1.5 h-9 w-full rounded-md text-sm transition-colors focus-visible:outline-none text-muted-foreground hover:bg-muted/50 hover:text-foreground overflow-hidden group"
                                    >
                                        <ChevronLeftIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                                        <span className="font-semibold text-foreground truncate whitespace-nowrap">{headerTitle}</span>
                                    </Link>
                                );
                                return (
                                    <>
                                        {collapsed ? (
                                            <Hint label={headerTitle} side="right">{backLink}</Hint>
                                        ) : backLink}
                                        <div className="h-px bg-border/50 my-2 mx-1" />
                                    </>
                                );
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
                                        const currentVal = searchParams?.get(key);
                                        if (key === 'tab' && val === 'dashboard' && (!currentVal || currentVal === 'dashboard')) {
                                            return;
                                        }
                                        if (currentVal !== val) match = false;
                                    });
                                    isActive = pathname === itemPath && match;
                                } else if (item.href === '/jobs') {
                                    isActive = pathname === '/jobs' && !searchParams?.get('type') && !searchParams?.get('mode') && !searchParams?.get('source') && !searchParams?.get('sort') && !searchParams?.get('filter');
                                } else if (item.href === '/admin/discovery' || item.href === '/discovery') {
                                    isActive = pathname === item.href && !searchParams?.get('tab');
                                } else {
                                    if ('exact' in item && item.exact) {
                                        isActive = pathname === item.href;
                                    } else {
                                        isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
                                    }
                                }
                                
                                const linkElement = (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "relative flex items-center gap-2 py-2 px-1.5 w-full h-9 rounded-md text-sm transition-colors focus:outline-none overflow-hidden",
                                            isActive
                                                ? 'bg-foreground/10 text-foreground font-semibold'
                                                : 'text-muted-foreground hover:bg-muted/50 dark:hover:bg-foreground/10 hover:text-foreground'
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 shrink-0 transition-all", isActive && "stroke-2")} />
                                        <span className="truncate whitespace-nowrap">{item.name}</span>
                                        {Boolean('hasSubmenu' in item && item.hasSubmenu) && !collapsed && (
                                            <ChevronRightIcon className="w-4 h-4 ml-auto text-muted-foreground/50 shrink-0" />
                                        )}
                                        {item.badge > 0 && !collapsed && (
                                            <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                        {item.badge > 0 && collapsed && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
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

                                return (
                                    <React.Fragment key={item.name}>
                            {context === 'jobs' && (item.name === 'Skills' || item.name === 'Government' || item.name === 'Post a Job') && (
                                <div className="h-px bg-border/40 my-1 mx-1.5" />
                            )}
                                        {context === 'government' && item.name === 'Private Jobs' && (
                                            <div className="h-px bg-border/40 my-1 mx-1.5" />
                                        )}
                                        {item.isSettingsDivider && customHeaderTitle === 'Admin Portal' && (
                                            <>
                                                {!collapsed && <span className="px-1.5 pt-4 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Settings</span>}
                                                {collapsed && <div className="h-px bg-border/40 my-2 mx-1.5" />}
                                            </>
                                        )}
                                        {collapsed ? (
                                            <Hint label={item.name} side="right">{linkElement}</Hint>
                                        ) : linkElement}
                                    </React.Fragment>
                                );
                            })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* 3. FOOTER */}
                {onToggleCollapse && (
                    <div className="px-1 pb-1 mt-auto">
                        {showThemeToggle && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <ThemeSwitcher className="w-full">
                                        <button
                                            type="button"
                                            suppressHydrationWarning
                                            className="w-full flex items-center gap-2 px-1.5 rounded-md h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-hidden mb-1"
                                            aria-label="Toggle Theme"
                                        >
                                            {theme === 'dark' ? (
                                                <Sun size={20} strokeWidth={1.5} className="shrink-0 transition-colors" />
                                            ) : (
                                                <Moon size={20} strokeWidth={1.5} className="shrink-0 transition-colors" />
                                            )}
                                            {!collapsed && (
                                                <span className="text-sm whitespace-nowrap text-left truncate">
                                                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                                </span>
                                            )}
                                        </button>
                                    </ThemeSwitcher>
                                </TooltipTrigger>
                                {collapsed && (
                                    <TooltipContent side="right" className="flex items-center gap-2">
                                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    suppressHydrationWarning
                                    onClick={onToggleCollapse}
                                    className="w-full flex items-center gap-2 px-1.5 rounded-md h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-hidden"
                                    aria-label="Toggle Sidebar"
                                >
                                    <SidebarIcon className="w-5 h-5 shrink-0" />
                                    <span className="text-sm whitespace-nowrap text-left truncate">Collapse</span>
                                    {!collapsed && (
                                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded border border-border shrink-0">Ctrl+B</span>
                                    )}
                                </button>
                            </TooltipTrigger>
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

function AppSidebarInner() {
    const rawPathname = usePathname();
    const pathname = rawPathname || '';
    const searchParams = useSearchParams();

    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const [, setCollapsed] = useState(false);
    const [visuallyCollapsed, setVisuallyCollapsed] = useState(false);

    const handleToggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            if (!next) {
                setVisuallyCollapsed(false);
            } else {
                setTimeout(() => setVisuallyCollapsed(true), 600);
            }
            localStorage.setItem('ff:sidebarCollapsed', String(next));
            document.documentElement.style.setProperty('--sidebar-w', next ? '3rem' : '12rem');
            document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
            return next;
        });
    };

    useEffect(() => {
        const stored = localStorage.getItem('ff:sidebarCollapsed');
        const isCol = stored === 'true';
        if (isCol) {
            setCollapsed(true);
            setVisuallyCollapsed(true);
        }
        document.documentElement.style.setProperty('--sidebar-w', isCol ? '3rem' : '12rem');
        document.documentElement.setAttribute('data-sidebar', isCol ? 'collapsed' : 'expanded');
    }, []);

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

    return (
        <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-[var(--sidebar-w,12rem)] transition-[width] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)] overflow-hidden">
            <SidebarContent pathname={pathname} searchParams={searchParams} collapsed={visuallyCollapsed} onToggleCollapse={handleToggleCollapse} hostname={hostname} />
        </aside>
    );
}

export function AppSidebar() {
    return (
        <React.Suspense fallback={<aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-[var(--sidebar-w,12rem)] transition-[width] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)] overflow-hidden" />}>
            <AppSidebarInner />
        </React.Suspense>
    );
}
