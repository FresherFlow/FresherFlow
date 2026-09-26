'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/features/navigation/AppSidebar';
import { DesktopNav } from './DesktopNav';
import { MobileTopNav } from './MobileTopNav';
import { MobileBottomTabs } from './MobileBottomTabs';
import { SocialSidebar } from './SocialSidebar';
import { SIDEBAR_ROUTES, isSidebarPage } from './routeConfig';

// Re-exported so existing consumers (NavigationWrapper) keep working; the route
// list itself lives in ./routeConfig to avoid an import cycle with the headers.
export { SIDEBAR_ROUTES, isSidebarPage };

export const FEED_ROUTES = [
    '/jobs',
    '/jobs/internships',
    '/jobs/walkins',
    '/govt',
    '/jobs/remote',
    '/jobs/browse',
    '/off-campus',
    '/companies',
    '/skills',
    '/roles',
    '/locations',
    '/batch',
    '/resources',
];

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
        return <AppSidebar />;
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
                <Suspense fallback={null}>
                    <MobileBottomTabs />
                </Suspense>
            </>
        );
    }

    return (
        <>
            <SocialSidebar />
            <MobileTopNav />
            <Suspense fallback={null}>
                <MobileBottomTabs />
            </Suspense>
        </>
    );
}







