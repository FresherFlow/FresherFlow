'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav, isSidebarPage } from '@/features/navigation/Navigation';
import { cn } from "@/ui/cn";

import { FeedHeaderProvider } from '@/lib/providers/FeedHeaderProvider';
import { SidebarProvider } from '@/ui/sidebar';
import { ensureSidebarRepeatGuard, SIDEBAR_W_VAR, useSidebarOpenState } from '@/features/navigation/sidebarState';

// Module scope (not an effect): effects in the shadcn provider mount
// before ours, so only import-time registration gets ahead of its
// keydown listener to swallow auto-repeat. No-op on the server.
ensureSidebarRepeatGuard();

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';

    // Only keep logic related to layout structure inside (app)
    const isSidebarRoute = isSidebarPage(normalizedPathname);

    // Controlled collapse state: the single source of truth for the rail width
    // and for the fixed header offset (`left: var(--sidebar-w)`), both fed from
    // SIDEBAR_W_VAR. The rail's own gap element reserves content space, so no
    // second content offset is added here — one token, one offset.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    return (
        <SidebarProvider
            open={sidebarOpen}
            onOpenChange={handleSidebarOpenChange}
            style={{ "--sidebar-width": SIDEBAR_W_VAR } as React.CSSProperties}
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

