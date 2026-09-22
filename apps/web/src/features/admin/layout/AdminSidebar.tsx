'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from 'react';
import { X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { NavMain } from '@/features/navigation/NavMain';
import type { SpaceNavGroup } from '@/features/navigation/navConfig';
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
import {
    Squares2X2Icon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    ShieldCheckIcon,
    Cog8ToothIcon,
    ShareIcon,
    BookOpenIcon,
    BellAlertIcon,
    PlusCircleIcon,
    QueueListIcon,
    UserGroupIcon,
    CheckCircleIcon,
    BuildingOfficeIcon,
    CpuChipIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    GlobeAltIcon,
    ChevronLeftIcon,
} from '@heroicons/react/24/outline';

/** Kept for MobileNavMenu: it maps `item.label`. Do not rename fields. */
export const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
    { href: '/admin/opportunities', label: 'Listings', icon: BriefcaseIcon, exact: true },
    { href: '/admin/profile-pages', label: 'Profile Pages', icon: UserGroupIcon },
    { href: '/admin/community-submissions', label: 'Submissions', icon: QueueListIcon },
    { href: '/admin/opportunities/create', label: 'New listing', icon: PlusCircleIcon },
    { href: '/admin/discovery', label: 'Discovery Engine', icon: ShieldCheckIcon, hasSubmenu: true },
];

export const settingsNavItems = [
    { href: '/admin/resources', label: 'Resources', icon: BookOpenIcon },
    { href: '/admin/rooms', label: 'Rooms', icon: BuildingOfficeIcon },
    { href: '/admin/captions', label: 'Captions', icon: ShareIcon },
    { href: '/admin/push', label: 'Push Alerts', icon: BellAlertIcon },
    { href: '/admin/feedback', label: 'Feedback', icon: ChatBubbleBottomCenterTextIcon },
    { href: '/admin/settings', label: 'Settings', icon: Cog8ToothIcon },
];

const discoveryNavItems = [
    { href: '/admin/dashboard', label: 'Back to Admin', icon: ChevronLeftIcon },
    { href: '/admin/discovery?tab=dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { href: '/admin/discovery?tab=runs', label: 'Discovery Runs', icon: QueueListIcon },
    { href: '/admin/discovery?tab=discovered', label: 'Discovered Jobs', icon: MagnifyingGlassIcon },
    { href: '/admin/discovery?tab=processed', label: 'Processed Jobs', icon: CheckCircleIcon },
    { href: '/admin/discovery?tab=companies', label: 'Target Companies', icon: BuildingOfficeIcon },
    { href: '/admin/discovery?tab=adapters', label: 'ATS Adapters', icon: CpuChipIcon },
    { href: '/admin/discovery?tab=boards', label: 'Job Boards', icon: GlobeAltIcon },
];

type AdminNavSourceItem = {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    exact?: boolean;
};

function toGroupItems(
    items: AdminNavSourceItem[],
    feedbackBadge: number,
): SpaceNavGroup['items'] {
    return items.map((item) => ({
        title: item.label,
        href: item.href,
        icon: item.icon,
        exact: item.exact,
        ...(item.label === 'Feedback' && feedbackBadge > 0 ? { badge: feedbackBadge } : {}),
    }));
}

function getAdminGroups(pathname: string, feedbackBadge: number): {
    groups: SpaceNavGroup[];
    headerTitle: string;
    homeHref: string;
} {
    if (pathname.startsWith('/admin/discovery')) {
        return {
            groups: [
                {
                    label: 'Discovery',
                    items: toGroupItems(discoveryNavItems, 0),
                    collapsible: true,
                    defaultOpen: true,
                },
            ],
            headerTitle: 'Discovery Engine',
            homeHref: '/admin/dashboard',
        };
    }
    return {
        groups: [
            {
                label: 'Overview',
                items: toGroupItems(mainNavItems, 0),
                collapsible: true,
                defaultOpen: true,
            },
            {
                label: 'Manage',
                items: toGroupItems(settingsNavItems, feedbackBadge),
                collapsible: true,
                defaultOpen: true,
            },
        ],
        headerTitle: 'Admin Portal',
        homeHref: '/admin/dashboard',
    };
}

/**
 * Brand block mirroring the app sidebar: full wordmark when expanded, centered
 * logo tile in collapsed (icon) mode.
 */
function AdminBrand({ href, title }: { href: string; title: string }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    size="lg"
                    className="h-9 justify-start px-2 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                    <Link href={href} aria-label="FresherFlow admin home">
                        <span className="sidebar-expanded-only flex min-w-0 items-center gap-2">
                            <LogoImage width={28} height={28} className="h-7 w-7 shrink-0" />
                            <span className="truncate text-base font-semibold">FresherFlow</span>
                            <span className="truncate text-xs text-muted-foreground">{title}</span>
                        </span>
                        <span className="sidebar-collapsed-only flex items-center justify-center">
                            <LogoImage
                                width={24}
                                height={24}
                                className="h-6 w-6 shrink-0 object-contain"
                            />
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function AdminSidebarRail({ feedbackAlertCount = 0 }: { feedbackAlertCount?: number }) {
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();
    const [isScrolled, setIsScrolled] = React.useState(false);

    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const effectiveFeedbackAlertCount =
        pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')
            ? 0
            : feedbackAlertCount;

    const { groups, headerTitle, homeHref } = getAdminGroups(pathname, effectiveFeedbackAlertCount);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader
                className={cn(
                    'sticky top-0 z-10 gap-1.5 bg-sidebar/95 p-2 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80 relative',
                    'border-b border-transparent transition-colors',
                    isScrolled && 'border-sidebar-border shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)]'
                )}
            >
                <AdminBrand href={homeHref} title={headerTitle} />
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
                <NavMain groups={groups} pathname={pathname} searchParams={searchParams} isAuthed />
            </SidebarContent>
            <SidebarFooter>
                <div className="flex items-center justify-between gap-2 p-2 group-data-[collapsible=icon]:justify-center">
                    <span
                        className="sidebar-expanded-only truncate text-xs text-muted-foreground"
                        title={hostname}
                    >
                        {hostname || 'admin'}
                    </span>
                    <ThemeSwitcher />
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

/**
 * Nav tree for the mobile drawer (rendered by MobileTopNav inside a Sheet on
 * `/admin` routes). Same groups as the rail, without a nested provider.
 */
export function AdminMobileNavTree({ onNavigate }: { onNavigate: () => void }) {
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();

    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const { groups, headerTitle, homeHref } = getAdminGroups(pathname, 0);

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
                <AdminBrand href={homeHref} title={headerTitle} />
                {/* Every nav row is a link, so any click in here is a navigation and
                    should close the Sheet. */}
                <div className="mt-2" onClickCapture={onNavigate}>
                    <NavMain groups={groups} pathname={pathname} searchParams={searchParams} isAuthed />
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
            <React.Suspense fallback={null}>
                <AdminSidebarRail feedbackAlertCount={feedbackAlertCount} />
            </React.Suspense>
        </div>
    );
}
