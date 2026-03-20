'use client';

import { Suspense, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav } from '@/features/system/navigation/Navigation';
import { Footer } from '@/components/ui/Footer';
import { cn } from '@/lib/utils';
import OfflineActionSync from './OfflineActionSync';
import { AuthContext } from '@/features/auth';

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    const isAuthRoute = normalizedPathname === '/login' || normalizedPathname === '/register';
    const adminHostRaw = process.env.NEXT_PUBLIC_ADMIN_WEB_HOST || 'admin.fresherflow.in';
    const adminHost = adminHostRaw
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
    const isAdminHost = typeof window !== 'undefined' && window.location.hostname.toLowerCase() === adminHost;
    const isAdminRoute = normalizedPathname.startsWith('/admin') || isAdminHost;

    const hideNav = isAdminRoute;
    const isHomePage = pathname === '/';

    const authContext = useContext(AuthContext);
    const isAuthenticated = !!authContext?.user;

    return (
        <>
            {!isAdminRoute && pathname !== '/' && <OfflineActionSync />}
            {!hideNav && (
                <Suspense fallback={null}>
                    <Navbar />
                </Suspense>
            )}
            <main className={cn(
                "relative w-full overflow-x-hidden",
                !isAdminRoute && "pt-[calc(3.75rem+env(safe-area-inset-top))] md:pt-[4.75rem]",
                !isAuthRoute && !isAdminRoute && !isHomePage && "pb-4 md:pb-8",
                (isAuthRoute || isAdminRoute) && "min-h-screen flex flex-col"
            )}>
                <div className={cn(
                    "flex-1 flex flex-col",
                    (!isAuthRoute && !isAdminRoute) && "min-h-[calc(100vh-10rem)]"
                )}>
                    {children}
                </div>
                {!isAdminRoute && !isAuthRoute && (
                    <Footer className={cn(isAuthenticated && "hidden md:block")} />
                )}
            </main>
            {!hideNav && (
                <Suspense fallback={null}>
                    <MobileNav />
                </Suspense>
            )}
        </>
    );
}






