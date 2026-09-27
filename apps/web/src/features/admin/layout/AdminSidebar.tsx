'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from 'react';
import { X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { useAdminLayout } from '@/features/admin/layout/AdminLayoutProvider';
import { AdminNavGroup } from '@/features/admin/layout/AdminNavGroup';
import { AdminNavUser } from '@/features/admin/layout/AdminNavUser';
import {
    getAdminSidebarGroups,
    toSpaceNavGroups,
} from '@/features/admin/layout/admin-sidebar-data';
import { NavMain } from '@/features/navigation/NavMain';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { cn } from '@/ui/cn';
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
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-logo-bg">
                            {/* Reference tile uses a size-4 glyph: TeamSwitcher's
                                `<activeTeam.logo className='size-4' />`. The 20px
                                logo made the tile read heavier than the rail icons. */}
                            <LogoImage
                                width={16}
                                height={16}
                                className="size-4 shrink-0 object-contain"
                            />
                        </div>
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

    const effectiveFeedbackAlertCount =
        pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')
            ? 0
            : feedbackAlertCount;

    return getAdminSidebarGroups(pathname, effectiveFeedbackAlertCount);
}

function AdminSidebarRail({ feedbackAlertCount = 0 }: { feedbackAlertCount?: number }) {
    const [isScrolled, setIsScrolled] = React.useState(false);
    const { collapsible, variant } = useAdminLayout();

    // Keep shell always mounted — only the nav list suspends. This prevents
    // the entire rail from disappearing (blink) when useSearchParams suspends
    // on navigation (common with Next's opt-in Suspense bailout).
    return (
        <Sidebar collapsible={collapsible} variant={variant}>
            <SidebarHeader
                className={cn(
                    'sticky top-0 z-10 gap-1.5 bg-sidebar/95 p-2 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80 relative',
                    'border-b border-transparent transition-colors',
                    isScrolled && 'border-sidebar-border shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)]'
                )}
            >
                {/* Brand is resolved inside the suspended nav so it updates with route, but we render a stable fallback */}
                <React.Suspense fallback={<AdminBrand href="/admin/dashboard" />}>
                    <AdminSidebarBrandResolver feedbackAlertCount={feedbackAlertCount} />
                </React.Suspense>
                {/* blur fade so scrolled items feel going under header */}
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-gradient-to-b from-sidebar to-transparent opacity-0 transition-opacity',
                        isScrolled && 'opacity-100'
                    )}
                />
            </SidebarHeader>
            <SidebarContent onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 2)}>
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
 * `/admin` routes). Same groups as the rail, rendered through `NavMain`
 * because the drawer lives outside the desktop `SidebarProvider`.
 */
export function AdminMobileNavTree({ onNavigate }: { onNavigate: () => void }) {
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();

    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const { groups, homeHref } = getAdminSidebarGroups(pathname, 0);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
            <div className="flex h-14 shrink-0 items-center justify-end border-b border-sidebar-border px-4">
                <button
                    type="button"
                    onClick={onNavigate}
                    aria-label="Close menu"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3">
                <AdminBrand href={homeHref} />
                {/* Every nav row is a link, so any click in here is a navigation and
                    should close the Sheet. */}
                <div className="mt-2" onClickCapture={onNavigate}>
                    <NavMain groups={toSpaceNavGroups(groups)} pathname={pathname} searchParams={searchParams} isAuthed />
                </div>
            </div>
            <div className="shrink-0 border-t border-sidebar-border p-2">
                <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-xs text-muted-foreground" title={hostname}>
                        {hostname || 'admin'}
                    </span>
                    <ThemeSwitcher />
                </div>
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
