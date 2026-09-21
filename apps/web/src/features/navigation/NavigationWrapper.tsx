'use client';

import React, { useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav, isSidebarPage } from '@/features/navigation/Navigation';
import { cn } from "@/ui/cn";
import { AuthContext } from '@/lib/auth/AuthContext';

import { FeedHeaderProvider } from '@/lib/providers/FeedHeaderProvider';
import { SidebarProvider } from '@/ui/sidebar';
import { useSidebarOpenState } from '@/features/navigation/sidebarState';

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

    // Controlled collapse state: the single source of truth for the rail width,
    // the fixed header offset (`left: var(--sidebar-w)`), and the content offset
    // (`lg:pl-[var(--sidebar-w)]`). Without this the stock SidebarProvider keeps
    // its own internal `open` while `--sidebar-w` stays at the load-time value,
    // so the header overlaps the rail when expanded.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    return (
        <SidebarProvider
            open={sidebarOpen}
            onOpenChange={handleSidebarOpenChange}
            style={{ "--sidebar-width": "var(--sidebar-w, 12rem)" } as React.CSSProperties}
        >
            <Navbar />

            <main
                suppressHydrationWarning
                className={cn(
                    "relative w-full overflow-x-hidden flex-1 flex flex-col",
                    "pt-14",
                    "lg:pt-14",
                    !isSidebarRoute && "lg:pt-22",
                    isSidebarRoute ? "pb-0" : "pb-0 lg:pb-0",
                    isSidebarRoute && "lg:pl-[var(--sidebar-w,12rem)] transition-[padding] duration-200 ease-linear"
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
        </SidebarProvider>
    );
}

