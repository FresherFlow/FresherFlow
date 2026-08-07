'use client';

import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/utils';
import { AuthContext } from '@/lib/auth/AuthContext';
import { LogoImage } from './LogoImage';
import {
    HomeIcon,
    BriefcaseIcon,
    BuildingLibraryIcon,
    BuildingOfficeIcon,
    BookmarkIcon,
    UserCircleIcon,
    ArrowLeftIcon,
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
    ChevronRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/ui/Sheet';

const DEFAULT_NAV_ITEMS = [
    { name: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
    { name: 'Government', href: '/government-jobs', icon: BuildingLibraryIcon, hasSubmenu: true },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Bookmarks', href: '/saved', icon: BookmarkIcon },
    { name: 'Account', href: '/account', icon: UserCircleIcon },
];

const JOBS_NAV_ITEMS = [
    { name: 'All Jobs', href: '/opportunities', icon: BriefcaseIcon },
    { name: 'Internships', href: '/internships', icon: AcademicCapIcon },
    { name: 'Remote', href: '/remote', icon: ComputerDesktopIcon },
    { name: 'Walk-ins', href: '/walk-ins', icon: UserGroupIcon },
    { name: 'Off-campus', href: '/off-campus', icon: MapIcon },
    { name: 'Latest', href: '/jobs/latest', icon: ClockIcon },
    { name: 'Trending', href: '/opportunities?filter=trending', icon: FireIcon },
    { name: 'Skills', href: '/skills', icon: SparklesIcon },
    { name: 'Roles', href: '/roles', icon: IdentificationIcon },
    { name: 'Location', href: '/location', icon: MapIcon },
    { name: 'Company', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Batch', href: '/batch', icon: AcademicCapIcon },
];

const GOVT_NAV_ITEMS = [
    { name: 'Latest', href: '/government-jobs/latest', icon: ClockIcon },
    { name: 'UPSC', href: '/government-jobs/upsc', icon: BuildingLibraryIcon },
    { name: 'SSC', href: '/government-jobs/ssc', icon: BuildingLibraryIcon },
    { name: 'Banking', href: '/government-jobs/bank', icon: BanknotesIcon },
    { name: 'Railways', href: '/government-jobs/railways', icon: TruckIcon },
    { name: 'PSU', href: '/government-jobs/psu', icon: BuildingLibraryIcon },
    { name: 'Defence', href: '/government-jobs/defence', icon: ShieldCheckIcon },
    { name: 'Teaching', href: '/government-jobs/teaching', icon: AcademicCapIcon },
    { name: 'Results', href: '/government-jobs/results', icon: DocumentCheckIcon },
    { name: 'Admit Cards', href: '/government-jobs/admit-card', icon: IdentificationIcon },
];

const ACCOUNT_NAV_ITEMS = [
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
    user: any;
    isMounted?: boolean;
}

function SidebarContent({ pathname, user, isMounted }: SidebarContentProps) {
    const homeHref = user ? '/dashboard' : '/';
    const logoHref = homeHref;

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
    } else if (pathname.startsWith('/govt') || pathname.startsWith('/government-jobs')) {
        context = 'government';
    } else if (
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/internships') ||
        pathname.startsWith('/remote') ||
        pathname.startsWith('/walk-ins') ||
        pathname.startsWith('/opportunities') ||
        pathname.startsWith('/off-campus') ||
        pathname.startsWith('/skills') ||
        pathname.startsWith('/roles') ||
        pathname.startsWith('/location') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/batch')
    ) {
        context = 'jobs';
    }

    const isSubContext = context !== 'default';
    const headerTitle = context === 'account' ? 'Account' : context === 'government' ? 'Government' : 'Jobs';
    const baseNavItems = context === 'account' ? ACCOUNT_NAV_ITEMS : context === 'government' ? GOVT_NAV_ITEMS : context === 'jobs' ? JOBS_NAV_ITEMS : DEFAULT_NAV_ITEMS;
    const navItems = baseNavItems.map(item => item.name === 'Home' ? { ...item, href: homeHref } : item);

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-48 pb-4">
            {isSubContext ? (
                <>
                    <div className="h-14 flex items-center px-3 border-b border-border mb-4">
                        <Link
                            href={homeHref}
                            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4 shrink-0" />
                            <span>Home</span>
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-5 custom-scrollbar no-scrollbar">
                        <div>
                            <div className="px-2 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {headerTitle}
                            </div>
                            <div className="space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
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
                    <div className="h-14 flex items-center px-3 border-b border-border mb-4">
                        <Link href={logoHref} className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
                            <LogoImage width={28} height={28} className="w-7 h-7 object-contain shrink-0" />
                            <span className="text-lg font-bold text-foreground">FresherFlow</span>
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-5 custom-scrollbar no-scrollbar">
                        <div className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
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
                                        {(item as any).hasSubmenu && (
                                            <ChevronRightIcon className="w-4 h-4 ml-auto" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
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

    const homeHref = user ? '/dashboard' : '/';
    const logoHref = homeHref;

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50">
                <SidebarContent pathname={pathname} user={user} isMounted={isMounted} />
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
                            <SidebarContent pathname={pathname} user={user} isMounted={isMounted} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    );
}

