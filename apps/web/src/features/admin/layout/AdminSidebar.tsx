'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { useAdmin } from '@/lib/auth/AdminContext';
import { useAdminLayout } from '@/features/admin/layout/AdminLayoutProvider';
import { navPermissions } from '@/features/admin/moderatorAccess';
import { AdminNavGroup } from '@/features/admin/layout/AdminNavGroup';
import { AdminNavUser } from '@/features/admin/layout/AdminNavUser';
import {
    getAdminSidebarGroups,
} from '@/features/admin/layout/admin-sidebar-data';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/ui/sidebar';

/**
 * Kept for MobileNavMenu (it maps `item.label`) and AdminCommandMenu.
 * Canonical nav data lives in `./admin-sidebar-data` — do not add items here.
 */
export {
    discoveryNavItems,
    mainNavItems,
    overviewCommandItems,
    settingsNavItems,
} from '@/features/admin/layout/admin-sidebar-data';

/**
 * Brand block following shadcn-admin's header pattern exactly (TeamSwitcher
 * structure): a size-8 logo tile plus two-line wordmark inside a size-lg
 * menu button. No custom expanded/collapsed spans — the primitive's
 * overflow + size rules own the collapse animation, so opening/closing
 * matches the reference instead of snapping via display toggles.
 */
function AdminBrand({ href }: { href: string }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                    <Link href={href} aria-label="FresherFlow admin home">
                        <LogoImage width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
                        <div className="grid flex-1 text-start text-sm leading-tight">
                            <span className="truncate font-semibold">admin</span>
                            <span className="truncate text-xs">FresherFlow</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function useAdminSidebarRoute(feedbackAlertCount: number) {
    const pathname = usePathname() || '';
    const { admin, moderator } = useAdmin();

    const effectiveFeedbackAlertCount =
        pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')
            ? 0
            : feedbackAlertCount;

    return getAdminSidebarGroups(
        pathname,
        effectiveFeedbackAlertCount,
        navPermissions(admin, moderator),
    );
}

function AdminSidebarRail({ feedbackAlertCount = 0 }: { feedbackAlertCount?: number }) {
    const { collapsible, variant } = useAdminLayout();

    // Keep shell always mounted — only the nav list suspends. This prevents
    // the entire rail from disappearing (blink) when useSearchParams suspends
    // on navigation (common with Next's opt-in Suspense bailout).
    return (
        <Sidebar collapsible={collapsible} variant={variant}>
            <SidebarHeader>
                <React.Suspense fallback={<AdminBrand href="/admin/dashboard" />}>
                    <AdminSidebarBrandResolver feedbackAlertCount={feedbackAlertCount} />
                </React.Suspense>
            </SidebarHeader>
            <SidebarContent>
                <React.Suspense fallback={<div className="p-2 opacity-0" aria-hidden />}>
                    <AdminSidebarNavContent feedbackAlertCount={feedbackAlertCount} />
                </React.Suspense>
            </SidebarContent>
            <SidebarFooter>
                <AdminNavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

function AdminSidebarBrandResolver({ feedbackAlertCount = 0 }: { feedbackAlertCount?: number }) {
    const { homeHref } = useAdminSidebarRoute(feedbackAlertCount);
    return <AdminBrand href={homeHref} />;
}

function AdminSidebarNavContent({ feedbackAlertCount = 0 }: { feedbackAlertCount?: number }) {
    const { groups } = useAdminSidebarRoute(feedbackAlertCount);
    return (
        <>
            {groups.map((group) => (
                <AdminNavGroup key={group.title} group={group} />
            ))}
        </>
    );
}

/**
 * Nav tree for the mobile drawer (rendered by MobileTopNav inside a Sheet on
 * `/admin` routes). Same groups through the same `AdminNavGroup` as the rail
 * (shadcn pattern: one nav tree, rail + drawer) — never a parallel menu, so
 * collapse state can never leak into the drawer via global CSS.
 */
export function AdminMobileNavTree({ onNavigate }: { onNavigate: () => void }) {
    const pathname = usePathname() || '';
    const { admin, moderator } = useAdmin();

    const { groups, homeHref } = getAdminSidebarGroups(pathname, 0, navPermissions(admin, moderator));

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
            <div className="flex-1 overflow-y-auto px-2 py-3">
                <AdminBrand href={homeHref} />
                {/* Close on link clicks only: collapsible parents (Jobs,
                    Discovery Engine) expand in place via chevron and must NOT
                    dismiss the drawer — the old blanket capture closed it. */}
                <div
                    className="mt-2"
                    onClickCapture={(event) => {
                        if ((event.target as HTMLElement).closest('a')) onNavigate();
                    }}
                >
                    {groups.map((group) => (
                        <AdminNavGroup key={group.title} group={group} />
                    ))}
                </div>
            </div>
            <div className="shrink-0 border-t border-sidebar-border p-2">
                <AdminNavUser />
            </div>
        </div>
    );
}

/**
 * Desktop rail for admin routes.
 *
 * The `SidebarProvider` lives in AdminLayoutClient, not here: the mobile drawer
 * trigger lives in MobileTopNav, so both need the same provider.
 *
 * Wrapped in `hidden lg:block` — the Sidebar's internal gap element reserves
 * content space at `lg` and up. Without the wrapper the rail renders from `md`
 * up and overlaps the content between 768px and 1024px.
 */
export function AdminSidebar({
    feedbackAlertCount = 0,
}: {
    feedbackAlertCount?: number;
}) {
    return (
        <div className="hidden lg:block">
            <AdminSidebarRail feedbackAlertCount={feedbackAlertCount} />
        </div>
    );
}
