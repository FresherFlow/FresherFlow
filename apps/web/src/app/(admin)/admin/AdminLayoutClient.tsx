'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type CSSProperties } from 'react';
import AdminBottomNav from '@/features/navigation/AdminBottomNav';
import { AdminCommandMenu } from '@/features/admin/layout/AdminCommandMenu';
import { AdminLayoutProvider, useAdminLayout } from '@/features/admin/layout/AdminLayoutProvider';
import { AdminPaletteProvider } from '@/features/admin/layout/AdminPaletteProvider';
import { AdminSidebar } from '@/features/admin/layout/AdminSidebar';
import { MobileTopNav } from '@/features/navigation/MobileTopNav';
import { TopHeaderBar } from '@/features/navigation/TopHeaderBar';
import { getStoredSidebarWidthOrDefault, useSidebarOpenState } from '@/features/navigation/sidebarState';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { cn } from '@/ui/cn';
import { SidebarInset, SidebarProvider } from '@/ui/sidebar';

/**
 * Authenticated admin shell (inside `AdminLayoutProvider`, so the admin
 * layout context is available here).
 *
 * Geometry note: the shared `sidebarState` store keeps writing `--sidebar-w`
 * on `documentElement` exactly as before (the app shell reads that value and
 * is never touched by admin choices). The admin overrides live on the shell
 * container below, which `TopHeaderBar` (`left: var(--sidebar-w)`) and the
 * rail binding (`--sidebar-width: var(--sidebar-w)`) inherit from:
 * - `offcanvas` reserves no space, so the admin subtree sees `0px`;
 * - `none` is permanently expanded, so it sees the stored (or default) width;
 * - `icon` inherits `documentElement` unchanged (today's behavior, resize intact).
 */
function AdminShell({ children }: { children: React.ReactNode }) {
    const { collapsible, variant } = useAdminLayout();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        if (collapsible === 'offcanvas') {
            el.style.setProperty('--sidebar-w', '0px');
        } else if (collapsible === 'none') {
            el.style.setProperty('--sidebar-w', getStoredSidebarWidthOrDefault());
        } else {
            el.style.removeProperty('--sidebar-w');
        }
    }, [collapsible]);

    return (
        <div ref={containerRef} className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            <AdminSidebar />
            <TopHeaderBar />
            <SidebarInset
                className={cn(
                    // min-h-0 is load-bearing: without it this flex item will
                    // not shrink below its content height, the grid below grows
                    // unbounded, and the footer is clipped with nowhere to scroll.
                    'min-w-0 min-h-0 flex-1 overflow-hidden bg-background md:bg-muted/10',
                    // `SidebarInset` styles the inset variant through a
                    // `peer-data-[variant=inset]` sibling selector, which cannot
                    // match here: the rail is nested inside AdminSidebar's
                    // `hidden lg:block` wrapper. Mirror that styling from the
                    // layout context so `inset` still renders as a card.
                    variant === 'inset' && 'md:m-2 md:ml-0 md:rounded-xl md:shadow',
                )}
            >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <MobileTopNav />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 md:px-4 md:pb-4 md:pt-18">
                        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                            {children}
                        </div>
                    </div>
                    <AdminBottomNav />
                </div>
            </SidebarInset>
        </div>
    );
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    // Same controlled collapse/width store as the app shell: the rail's gap
    // element reserves content space and the fixed TopHeaderBar
    // (`left: var(--sidebar-w)`) stays in sync, persisting across reloads.
    // No extra padding on the content div: the Sidebar's internal gap already
    // offsets it, and a second offset would push everything right.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !pathname.includes('/login')) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    useEffect(() => {
        const title = pathname.includes('/login') ? 'Admin Login' : 'Admin Portal';
        document.title = `${title} - Admin`;
    }, [pathname]);

    if (isLoading) {
        return <LoadingScreen message="Loading admin portal..." />;
    }

    if (!isAuthenticated && !pathname.includes('/login')) {
        return null;
    }

    if (pathname.includes('/login')) {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    return (
        <AdminLayoutProvider>
            <SidebarProvider
                open={sidebarOpen}
                onOpenChange={handleSidebarOpenChange}
                style={{ "--sidebar-width": "var(--sidebar-w, 12rem)" } as CSSProperties}
            >
                <AdminPaletteProvider>
                    <AdminShell>{children}</AdminShell>
                    <AdminCommandMenu />
                </AdminPaletteProvider>
            </SidebarProvider>
        </AdminLayoutProvider>
    );
}
