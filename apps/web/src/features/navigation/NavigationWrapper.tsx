'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav, isSidebarPage } from '@/features/navigation/Navigation';
import { cn } from "@/ui/cn";

import { FeedHeaderProvider } from '@/lib/providers/FeedHeaderProvider';
import { SidebarProvider, useSidebar } from '@/ui/sidebar';
import { AppLayoutProvider, useAppLayout } from '@/features/navigation/AppLayoutProvider';
import { ensureSidebarRepeatGuard, SIDEBAR_W_VAR, useSidebarOpenState } from '@/features/navigation/sidebarState';
import { SiteHeader } from '@/features/navigation/SiteHeader';

// Module scope (not an effect): effects in the shadcn provider mount
// before ours, so only import-time registration gets ahead of its
// keydown listener to swallow auto-repeat. No-op on the server.
ensureSidebarRepeatGuard();

/**
 * Authenticated app shell.
 *
 * Wired like shadcn-admin's `AuthenticatedLayout`: the rail gap reserves
 * space, and on sidebar routes a content column holds the sticky `SiteHeader`
 * above `<main>` — so the header aligns in Sidebar / Inset / Floating with
 * zero offset math. No `--sidebar-w` overrides live here; the rail binding
 * reads the provider-level token exactly as before.
 */
function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';

    // Only keep logic related to layout structure inside (app)
    const isSidebarRoute = isSidebarPage(normalizedPathname);
    const { collapsible, variant } = useAppLayout();
    const { open } = useSidebar();

    const mainEl = (
        <main
            suppressHydrationWarning
            className={cn(
                "relative w-full overflow-x-hidden flex-1 flex flex-col",
                "pt-14",
                isSidebarRoute ? "lg:pt-0" : "lg:pt-22",
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
    );

    return (
        <>
            <Navbar />

            {isSidebarRoute ? (
                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col bg-background md:bg-muted/10',
                        // Same inset-card mirror as the admin shell: the
                        // primitive's peer selectors can't reach here, so the
                        // card styling is mirrored from layout context.
                        variant === 'inset' &&
                            collapsible !== 'none' &&
                            (open ? 'md:m-2 md:ml-0 md:rounded-xl md:shadow' : 'md:m-2 md:rounded-xl md:shadow'),
                    )}
                >
                    <SiteHeader />
                    {mainEl}
                </div>
            ) : (
                mainEl
            )}
            <MobileNav />
        </>
    );
}

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    // Controlled collapse state: the single source of truth for the rail width
    // and for the fixed header offset (`left: var(--sidebar-w)`), both fed from
    // SIDEBAR_W_VAR. The rail's own gap element reserves content space, so no
    // second content offset is added here — one token, one offset.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    return (
        <AppLayoutProvider>
            <SidebarProvider
                open={sidebarOpen}
                onOpenChange={handleSidebarOpenChange}
                style={{ "--sidebar-width": SIDEBAR_W_VAR } as React.CSSProperties}
            >
                <AppShell>{children}</AppShell>
            </SidebarProvider>
        </AppLayoutProvider>
    );
}
