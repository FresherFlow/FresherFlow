'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { TopUtilityBar } from './TopUtilityBar';
import { TopHeaderBar } from './TopHeaderBar';
import { DesktopNav } from './DesktopNav';
import { MobileTopNav } from './MobileTopNav';
import { MobileBottomTabs } from './MobileBottomTabs';
import { SocialSidebar } from './SocialSidebar';

export const SIDEBAR_ROUTES = [
    '/jobs',
    '/internships',
    '/walk-ins',
    '/government-jobs',
    '/govt',
    '/opportunities',
    '/remote',
    '/off-campus',
    '/companies',
    '/skills',
    '/roles',
    '/location',
    '/batch',
    '/saved',
    '/tracker',
    '/dashboard',
    '/profile',
    '/settings',
    '/alerts',
    '/notifications',
    '/account',
    '/accounts',
    '/followed-companies',
    '/contribute',
    '/referral',
    '/choose-username',
    '/resources',
];

export const FEED_ROUTES = [
    '/jobs',
    '/internships',
    '/walk-ins',
    '/government-jobs',
    '/govt',
    '/opportunities',
    '/remote',
    '/off-campus',
    '/companies',
    '/skills',
    '/roles',
    '/location',
    '/batch',
    '/saved',
    '/tracker',
    '/resources',
];

export function isSidebarPage(pathname: string): boolean {
    if (!pathname) return false;
    const normalized = pathname.toLowerCase();
    if (normalized === '/') return false;
    return SIDEBAR_ROUTES.some((route) => normalized.startsWith(route));
}

export function isFeedPage(pathname: string): boolean {
    if (!pathname) return false;
    const normalized = pathname.toLowerCase();
    if (normalized === '/') return true;
    return FEED_ROUTES.some((route) => normalized.startsWith(route));
}

export function Navbar() {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    
    if (isSidebarPage(normalizedPathname)) {
        return (
            <>
                <AppSidebar />
                <TopUtilityBar />
                <TopHeaderBar />
            </>
        );
    }

    return <DesktopNav />;
}

export function MobileNav() {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    
    if (isSidebarPage(normalizedPathname)) {
        return (
            <>
                <MobileTopNav />
                <MobileBottomTabs />
            </>
        );
    }

    return (
        <>
            <SocialSidebar />
            <MobileTopNav />
            <MobileBottomTabs />
        </>
    );
}







