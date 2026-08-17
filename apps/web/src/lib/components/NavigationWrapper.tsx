'use client';

import React, { useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav, isSidebarPage } from '@/lib/navigation/Navigation';
import { Footer } from '@/ui/Footer';
import { MiniFooter } from '@/ui/MiniFooter';
import { cn } from '@/lib/utils/utils';
// WEB PIVOT: keep offline sync code for later, but do not mount it on SEO web.
// import OfflineActionSync from '@/lib/components/OfflineActionSync';
import { AuthContext } from '@/lib/auth/AuthContext';

import { FeedHeaderProvider } from '@/lib/context/FeedHeaderContext';

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';

    // Only keep logic related to layout structure inside (app)
    const isSidebarRoute = isSidebarPage(normalizedPathname);
    
    // We can infer if it's a detail page to show MiniFooter instead of Footer
    const segments = normalizedPathname.split('/').filter(Boolean);
    const firstSegment = segments[0] || '';
    const reservedSegments = new Set([
        'account', 'batch', 'companies', 'deadlines', 'govt', 'jobs', 'locations', 
        'platforms', 'resources', 'roles', 'skills'
    ]);
    const isDetailPage =
        /^\/(jobs|govt)\/[^/]+/.test(normalizedPathname) ||
        (segments.length === 1 && !reservedSegments.has(firstSegment) && !firstSegment.includes('.'));

    const isJobRelatedPage =
        normalizedPathname.startsWith('/jobs') ||
        normalizedPathname.startsWith('/govt') ||
        normalizedPathname.startsWith('/companies') ||
        normalizedPathname.startsWith('/skills') ||
        normalizedPathname.startsWith('/locations') ||
        normalizedPathname.startsWith('/batch') ||
        normalizedPathname.startsWith('/roles') ||
        normalizedPathname.startsWith('/resources');

    const authContext = useContext(AuthContext);
    const isAuthenticated = !!authContext?.user;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const showFooter = !isSidebarRoute;

    return (
        <>
            <Navbar />

            <main
                suppressHydrationWarning
                className={cn(
                    "relative w-full overflow-x-hidden flex-1 flex flex-col",
                    "pt-[calc(3.75rem+env(safe-area-inset-top))]",
                    "md:pt-14",
                    !isSidebarRoute && "md:pt-[4.75rem]",
                    isSidebarRoute ? "pb-0" : ((mounted && isAuthenticated) ? "pb-20 md:pb-8" : "pb-4 md:pb-8"),
                    isSidebarRoute && "md:pl-[var(--sidebar-w,12rem)] transition-[padding-left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]"
                )}
            >
                <FeedHeaderProvider>
                    <div className={cn(
                        "flex-1 flex flex-col"
                    )}>
                        {children}
                    </div>
                </FeedHeaderProvider>
            </main>
            {showFooter && (
                <div>
                    <div className="hidden md:block">
                        {(isDetailPage || isJobRelatedPage) ? <MiniFooter /> : <Footer />}
                    </div>
                    <div className="md:hidden">
                        {(isDetailPage || isJobRelatedPage) ? null : <Footer />}
                    </div>
                </div>
            )}
            <MobileNav />
        </>
    );
}

