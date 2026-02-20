'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav } from '@/components/ui/Navigation';
import { Footer } from '@/components/ui/Footer';
import { cn } from '@/lib/utils';
import OfflineActionSync from '@/components/providers/OfflineActionSync';

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    const isAuthRoute = normalizedPathname === '/login' || normalizedPathname === '/register';
    const isAdminRoute = normalizedPathname.startsWith('/admin');

    const hideNav = isAdminRoute;
    const isHomePage = pathname === '/';

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
                !isAdminRoute && "pt-16",
                !isAuthRoute && !isAdminRoute && !isHomePage && "pb-4 md:pb-8",
                (isAuthRoute || isAdminRoute) && "min-h-screen flex flex-col"
            )}>
                <div className={cn(
                    "flex-1 flex flex-col",
                    (!isAuthRoute && !isAdminRoute) && "min-h-[calc(100vh-10rem)]"
                )}>
                    {children}
                </div>
                {!isAdminRoute && !isAuthRoute && <Footer />}
            </main>
            {!hideNav && (
                <Suspense fallback={null}>
                    <MobileNav />
                </Suspense>
            )}
        </>
    );
}
