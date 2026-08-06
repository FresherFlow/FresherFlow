'use client';

import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/utils';
import { AuthContext } from '@/lib/auth/AuthContext';
import { LogoImage } from './LogoImage';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    BookmarkIcon,
    ArchiveBoxIcon,
    UserCircleIcon,
    Bars3Icon,
    BuildingLibraryIcon,
    ArrowLeftIcon,
    Squares2X2Icon,
    BriefcaseIcon,
    BuildingOfficeIcon,
    BellIcon,
    LinkIcon,
    AcademicCapIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    Cog6ToothIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/ui/Sheet';

const WORKSPACE_NAV_ITEMS = [
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Tracker', href: '/tracker', icon: BriefcaseIcon },
    { name: 'Saved', href: '/saved', icon: BookmarkIcon },
    { name: 'Followed Companies', href: '/followed-companies', icon: BuildingOfficeIcon },
];

const PLATFORM_HELP_NAV_ITEMS = [
    { name: 'Alerts', href: '/alerts', icon: BellIcon },
    { name: 'Notifications', href: '/notifications', icon: BellIcon },
    { name: 'Submit Link', href: '/contribute', icon: LinkIcon },
    { name: 'Resources', href: '/resources', icon: AcademicCapIcon },
    { name: 'Feedback', href: '/feedback', icon: ChatBubbleLeftRightIcon },
    { name: 'Referrals', href: '/referral', icon: UserGroupIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

interface SidebarContentProps {
    isAccountArea: boolean;
    pathname: string;
    user: any;
    isMounted?: boolean;
}

function SidebarContent({ isAccountArea, pathname, user, isMounted }: SidebarContentProps) {
    const [opportunitiesOpen, setOpportunitiesOpen] = useState(true);
    const [trackerOpen, setTrackerOpen] = useState(true);
    const logoHref = isMounted && user ? '/dashboard' : '/';

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-48 pt-6 pb-4">
            {isAccountArea ? (
                <>
                    {/* TOP SECTION: BACK TO FEED */}
                    <div className="px-3 mb-4 pb-3 border-b border-border">
                        <Link
                            href="/jobs"
                            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4 shrink-0" />
                            <span>Back to Feed</span>
                        </Link>
                    </div>

                    {/* ACCOUNT WORKSPACE NAVIGATION */}
                    <div className="flex-1 overflow-y-auto px-2 space-y-5 custom-scrollbar no-scrollbar">
                        {/* SECTION 1: WORKSPACE */}
                        <div>
                            <div className="px-2 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                WORKSPACE
                            </div>
                            <div className="space-y-1">
                                {WORKSPACE_NAV_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        pathname === item.href ||
                                        pathname.startsWith(item.href + '/') ||
                                        (item.href === '/profile' && (pathname === '/account' || pathname.startsWith('/account/')));
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                                                isActive
                                                    ? 'bg-muted text-foreground font-medium'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SECTION 2: PLATFORM & HELP */}
                        <div>
                            <div className="px-2 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                PLATFORM & HELP
                            </div>
                            <div className="space-y-1">
                                {PLATFORM_HELP_NAV_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        pathname === item.href ||
                                        pathname.startsWith(item.href + '/');
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                                                isActive
                                                    ? 'bg-muted text-foreground font-medium'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* TOP: BRAND & GOVT JOBS SWITCHER */}
                    <div className="px-3 mb-6">
                        <Link href={logoHref} className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
                            <LogoImage width={28} height={28} className="w-7 h-7 object-contain shrink-0" />
                            <span className="text-lg font-bold text-foreground">FresherFlow</span>
                        </Link>
                        <Link
                            href="/government-jobs"
                            className="flex items-center justify-center gap-2 w-full px-2 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                            <BuildingLibraryIcon className="w-4 h-4" />
                            Govt Jobs
                        </Link>
                    </div>

                    {/* COLLAPSABLE NAVIGATION GROUPS */}
                    <div className="flex-1 overflow-y-auto px-2 space-y-6 custom-scrollbar no-scrollbar">
                        {/* GROUP A */}
                        <div>
                            <button
                                onClick={() => setOpportunitiesOpen(!opportunitiesOpen)}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                            >
                                <span>Explore</span>
                                {opportunitiesOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                            </button>
                            {opportunitiesOpen && (
                                <div className="mt-2 space-y-1">
                                    <Link
                                        href="/dashboard"
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                                            pathname === '/dashboard' || pathname.startsWith('/dashboard/')
                                                ? 'bg-muted text-foreground font-medium'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        )}
                                    >
                                        <Squares2X2Icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">Dashboard</span>
                                    </Link>
                                    <Link href="/opportunities" className={cn("flex items-center px-2 py-2 rounded-md text-sm transition-colors", pathname === '/opportunities' || pathname === '/' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>All</Link>
                                    <Link href="/walk-ins" className={cn("flex items-center px-2 py-2 rounded-md text-sm transition-colors", pathname === '/walk-ins' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>Walk-ins</Link>
                                    <Link href="/opportunities?filter=trending" className={cn("flex items-center px-2 py-2 rounded-md text-sm transition-colors", pathname.includes('trending') ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>Trending</Link>
                                </div>
                            )}
                        </div>

                        {/* GROUP B */}
                        <div>
                            <button
                                onClick={() => setTrackerOpen(!trackerOpen)}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                            >
                                <span>Tracker</span>
                                {trackerOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                            </button>
                            {trackerOpen && (
                                <div className="mt-2 space-y-1">
                                    <Link href="/saved" className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors", pathname === '/saved' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                                        <BookmarkIcon className="w-4 h-4" />
                                        Saved
                                    </Link>
                                    <Link href="/tracker?tab=applied" className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors", pathname.includes('applied') ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Applied
                                    </Link>
                                    <Link href="/tracker?tab=archived" className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors", pathname.includes('archived') ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                                        <ArchiveBoxIcon className="w-4 h-4" />
                                        Archived
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PINNED BOTTOM FOOTER */}
                    <div className="px-3 mt-auto border-t border-border pt-4">
                        <Link
                            href="/account"
                            className={cn(
                                "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                                pathname === '/account' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                        >
                            <UserCircleIcon className="w-4 h-4" />
                            Account
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export function AppSidebar() {
    const rawPathname = usePathname();
    const pathname = rawPathname || '';
    const context = useContext(AuthContext);
    const user = context?.user;
    const { theme, toggleTheme } = useTheme();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const logoHref = isMounted && user ? '/dashboard' : '/';

    const isAccountArea =
        pathname.startsWith('/profile') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/alerts') ||
        pathname.startsWith('/notifications') ||
        pathname.startsWith('/followed-companies') ||
        pathname.startsWith('/contribute') ||
        pathname.startsWith('/resources') ||
        pathname.startsWith('/feedback') ||
        pathname.startsWith('/referral') ||
        pathname.startsWith('/tracker') ||
        pathname.startsWith('/saved');

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50">
                <SidebarContent isAccountArea={isAccountArea} pathname={pathname} user={user} isMounted={isMounted} />
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
                            <SidebarContent isAccountArea={isAccountArea} pathname={pathname} user={user} isMounted={isMounted} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    );
}

