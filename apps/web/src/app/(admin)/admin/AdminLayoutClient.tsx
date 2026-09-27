'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type CSSProperties } from 'react';
import { ErrorState, ErrorStateButton } from '@/features/shell/ErrorState';
import { canAccessAdminRoute, getModeratorLanding } from '@/features/admin/moderatorAccess';
import AdminBottomNav from '@/features/navigation/AdminBottomNav';
import { AdminCommandMenu } from '@/features/admin/layout/AdminCommandMenu';
import { AdminLayoutProvider, useAdminLayout } from '@/features/admin/layout/AdminLayoutProvider';
import { AdminPaletteProvider } from '@/features/admin/layout/AdminPaletteProvider';
import { AdminSidebar } from '@/features/admin/layout/AdminSidebar';
import { MobileTopNav } from '@/features/navigation/MobileTopNav';
import { TopHeaderBar } from '@/features/navigation/TopHeaderBar';
import { useSidebarOpenState } from '@/features/navigation/sidebarState';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { cn } from '@/ui/cn';
import { SidebarInset, SidebarProvider, useSidebar } from '@/ui/sidebar';

/**
 * Authenticated admin shell (inside `AdminLayoutProvider`, so the admin
 * layout context is available here).
 *
 * Wired like shadcn-admin's `AuthenticatedLayout`: the rail gap reserves
 * space, content fills a `SidebarInset` column, and `TopHeaderBar` is sticky
 * in-flow at the top of that column — so it aligns in Sidebar / Inset /
 * Floating with zero offset math. No `--sidebar-w` overrides live here; the
 * rail binding reads the provider-level token exactly as before.
 */
function AdminShell({ children }: { children: React.ReactNode }) {
    const { collapsible, variant } = useAdminLayout();
    const { open } = useSidebar();

    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            <AdminSidebar />
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
                    // layout context so `inset` still renders as a card. The
                    // primitive keeps `ml-0` only while expanded and falls back
                    // to the uniform `m-2` (`ml-2`) when collapsed — mirroring
                    // `ml-0` unconditionally skewed content ~0.5rem left of the
                    // fixed header in the collapsed state. `none` renders no
                    // peer element, so the primitive applies no card styling
                    // there either.
                    variant === 'inset' &&
                        collapsible !== 'none' &&
                        (open ? 'md:m-2 md:ml-0 md:rounded-xl md:shadow' : 'md:m-2 md:rounded-xl md:shadow'),
                )}
            >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <TopHeaderBar />
                    <MobileTopNav />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 md:px-4 md:pb-4 md:pt-18 lg:pt-0">
                        {/* Constrained + centered like shadcn-admin's `Main`
                            (max-w-7xl unless fluid): tables sit in a readable
                            measure instead of stretching full-bleed. Pages
                            with their own max-w (push, rooms) nest inside. */}
                        <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden">
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
    const { isAuthenticated, isLoading, admin, moderator, logout } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    // Same controlled collapse/width store as the app shell: the rail's gap
    // element reserves content space and the fixed TopHeaderBar
    // (`left: var(--sidebar-w)`) stays in sync, persisting across reloads.
    // No extra padding on the content div: the Sidebar's internal gap already
    // offsets it, and a second offset would push everything right.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    useEffect(() => {
        const title = pathname.includes('/login') ? 'Admin Login' : 'Admin Portal';
        document.title = `${title} - Admin`;
    }, [pathname]);

    if (isLoading) {
        return <LoadingScreen message="Loading admin portal..." />;
    }

    if (!isAuthenticated && !pathname.includes('/login')) {
        // Explicit 401 instead of a blank screen + silent push: the session
        // may revalidate in the background (visibility refresh), in which
        // case content appears on its own; otherwise the operator picks login.
        return (
            <div className="min-h-screen bg-background text-foreground">
                <ErrorState
                    code="401"
                    title="Admin sign-in required."
                    message="This area needs an admin session. Sign in to continue."
                >
                    <ErrorStateButton href="/admin/login">Go to admin login</ErrorStateButton>
                </ErrorState>
            </div>
        );
    }

    if (pathname.includes('/login')) {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    // Moderator sessions see queues only. Dashboard (and bare /admin) reroute
    // to their first permitted queue; anything else outside their keys is an
    // explicit 403 with an exit — never a silent API-error page.
    if (!admin && moderator && !pathname.includes('/login')) {
        const access = { isAdmin: false, permissions: moderator.permissions };
        if (!canAccessAdminRoute(pathname, access)) {
            const landing = getModeratorLanding(moderator.permissions);
            if (landing !== '' && (pathname === '/admin/dashboard' || pathname === '/admin')) {
                router.replace(landing);
                return <LoadingScreen message="Opening your queues..." />;
            }
            return (
                <div className="min-h-screen bg-background text-foreground">
                    <ErrorState
                        code="403"
                        title="Not part of your queues."
                        message="Your moderator access doesn't include this area. Ask an admin for the right permission."
                    >
                        {landing !== '' ? (
                            <ErrorStateButton href={landing}>Go to my queues</ErrorStateButton>
                        ) : null}
                        <ErrorStateButton
                            variant="outline"
                            onClick={() => {
                                void logout();
                            }}
                        >
                            Exit to app
                        </ErrorStateButton>
                    </ErrorState>
                </div>
            );
        }
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
