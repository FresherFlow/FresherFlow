'use client';

import { Suspense, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav } from '@/lib/navigation/Navigation';
import { Footer } from '@/ui/Footer';
import { cn } from '@/lib/utils/utils';
// WEB PIVOT: keep offline sync code for later, but do not mount it on SEO web.
// import OfflineActionSync from '@/lib/components/OfflineActionSync';
import { AuthContext } from '@/lib/auth/AuthContext';
import { ADMIN_WEB_HOST } from '@/lib/utils/runtimeConfig';

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    const isAuthRoute = normalizedPathname === '/login' || normalizedPathname === '/register';
    const isAdminHost = process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined' &&
        window.location.hostname.toLowerCase() === ADMIN_WEB_HOST;
    const isAdminRoute = normalizedPathname.startsWith('/admin') || isAdminHost;
    const isCaptionsPage = normalizedPathname.startsWith('/captions');

    const hideNav = isAdminRoute || isCaptionsPage;
    const isHomePage = pathname === '/';

    const authContext = useContext(AuthContext);
    const isAuthenticated = !!authContext?.user;

    return (
        <>
            {/* WEB PIVOT: disabled user offline sync to avoid background API calls. */}
            {/* {!isAdminRoute && pathname !== '/' && <OfflineActionSync />} */}
            {!hideNav && (
                <Suspense fallback={null}>
                    <Navbar />
                </Suspense>
            )}

            <main className={cn(
                "relative w-full overflow-x-hidden flex-1 flex flex-col",
                !isAdminRoute && !isCaptionsPage && "pt-[calc(3.75rem+env(safe-area-inset-top))] md:pt-[4.75rem]",
                !isAdminRoute && !isCaptionsPage && !isHomePage && isAuthenticated && "pb-20 md:pb-8",
                !isAdminRoute && !isCaptionsPage && !isHomePage && !isAuthenticated && "pb-4 md:pb-8",
                "min-h-screen"
            )}>
                <div className={cn(
                    "flex-1 flex flex-col"
                )}>
                    {children}
                </div>
            </main>
            {!isAdminRoute && !isAuthRoute && !isCaptionsPage && (
                <Footer />
            )}
            {!hideNav && (
                <Suspense fallback={null}>
                    <MobileNav />
                </Suspense>
            )}
        </>
    );
}
