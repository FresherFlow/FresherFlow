'use client';

import React, { useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav, isSidebarPage } from '@/lib/navigation/Navigation';
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
    
    const authContext = useContext(AuthContext);
    const isAuthenticated = !!authContext?.user;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Navbar />

            <main
                suppressHydrationWarning
                className={cn(
                    "relative w-full overflow-x-hidden flex-1 flex flex-col",
                    "pt-[calc(3.75rem+env(safe-area-inset-top))]",
                    "lg:pt-14",
                    !isSidebarRoute && "lg:pt-[calc(1.75rem+3.75rem)]",
                    isSidebarRoute ? "pb-0" : "pb-0 lg:pb-0",
                    isSidebarRoute && "lg:pl-[var(--sidebar-w,12rem)] transition-[padding-left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]"
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
            <MobileNav />
        </>
    );
}

