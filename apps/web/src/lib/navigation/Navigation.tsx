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
    '/opportunities',
    '/remote',
    '/saved',
    '/tracker',
    '/dashboard',
    '/profile',
    '/settings',
    '/alerts',
    '/notifications',
    '/account',
    '/followed-companies',
    '/contribute',
    '/resources',
    '/feedback',
    '/referral',
];

export const FEED_ROUTES = [
    '/jobs',
    '/internships',
    '/walk-ins',
    '/government-jobs',
    '/opportunities',
    '/remote',
    '/saved',
    '/tracker',
];

export function isSidebarPage(pathname: string): boolean {
    if (!pathname) return false;
    const normalized = pathname.toLowerCase();
    return SIDEBAR_ROUTES.some((route) => normalized.startsWith(route));
}

export function isFeedPage(pathname: string): boolean {
    if (!pathname) return false;
    const normalized = pathname.toLowerCase();
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
        return null; // Handled by AppSidebar mobile header
    }

    return (
        <>
            <SocialSidebar />
            <MobileTopNav />
            <MobileBottomTabs />
        </>
    );
}







