'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { isSpaceItemActive } from '@/features/navigation/navConfig';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { cn } from '@/ui/cn';
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
} from '@heroicons/react/24/outline';

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

type AdminNavItem = {
    name: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    exact?: boolean;
    badge?: number;
    /** Renders a separator instead of a link. */
    divider?: boolean;
};

/**
 * Body of the admin rail.
 *
 * This used to be `lib/navigation/sidebar-content.tsx`, the shared
 * pre-refactor sidebar shell. That module is gone, so the brand header, the
 * nav list and the theme toggle live here now. Active state reuses
 * `isSpaceItemActive` so admin highlighting follows the same rules as the
 * app sidebar.
 */
function AdminRail({
    pathname,
    searchParams,
    hostname,
    customNavItems,
    customHeaderTitle,
    customHomeHref,
    showThemeToggle,
}: {
    pathname: string;
    searchParams: ReturnType<typeof useSearchParams>;
    hostname: string;
    customNavItems: AdminNavItem[];
    customHeaderTitle?: string;
    customHomeHref?: string;
    showThemeToggle?: boolean;
}) {
    return (
        <div className="flex h-full w-full flex-col border-r border-border bg-card select-none">
            <div className="flex h-14 shrink-0 items-center border-b border-border px-2">
                <Link
                    href={customHomeHref || '/admin/dashboard'}
                    className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none"
                >
                    <LogoImage width={28} height={28} className="h-7 w-7" />
                    <span className="truncate text-lg font-bold text-foreground">
                        {customHeaderTitle || 'Admin'}
                    </span>
                </Link>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4" aria-label="Admin">
                {customNavItems.map((item, index) => {
                    if (item.divider) {
                        return (
                            <div
                                key={`divider-${index}`}
                                role="separator"
                                className="my-2 h-px bg-border/50"
                            />
                        );
                    }
                    const Icon = item.icon;
                    const isActive = isSpaceItemActive(item, pathname, searchParams);
                    return (
                        <Link
                            key={`${item.href}-${index}`}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'relative flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-sm transition-colors focus:outline-none',
                                isActive
                                    ? 'bg-foreground/10 font-semibold text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{item.name}</span>
                            {typeof item.badge === 'number' && item.badge > 0 && (
                                <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border p-2">
                <span className="truncate text-xs text-muted-foreground" title={hostname}>
                    {hostname || 'admin'}
                </span>
                {showThemeToggle && <ThemeSwitcher />}
            </div>
        </div>
    );
}

export function AdminSidebar({
    feedbackAlertCount = 0
}: {
    feedbackAlertCount?: number;
}) {
    useAdmin();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);


    const effectiveFeedbackAlertCount = (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) ? 0 : feedbackAlertCount;

    const isDiscovery = pathname.startsWith('/admin/discovery');

    const customNavItems: AdminNavItem[] = isDiscovery ? [
        { name: 'Dashboard', href: '/admin/discovery?tab=dashboard', icon: ChartBarIcon },
        { name: 'Discovery Runs', href: '/admin/discovery?tab=runs', icon: QueueListIcon },
        { name: 'Discovered Jobs', href: '/admin/discovery?tab=discovered', icon: MagnifyingGlassIcon },
        { name: 'Processed Jobs', href: '/admin/discovery?tab=processed', icon: CheckCircleIcon },
        { name: 'Target Companies', href: '/admin/discovery?tab=companies', icon: BuildingOfficeIcon },
        { name: 'ATS Adapters', href: '/admin/discovery?tab=adapters', icon: CpuChipIcon },
        { name: 'Job Boards', href: '/admin/discovery?tab=boards', icon: GlobeAltIcon },
    ] : [
        ...mainNavItems.map(item => ({ ...item, name: item.label, href: item.href, icon: item.icon })),
        { name: '', href: '', icon: Squares2X2Icon, divider: true },
        ...settingsNavItems.map(item => {
            const base: AdminNavItem = { name: item.label, href: item.href, icon: item.icon };
            if (item.label === 'Feedback' && effectiveFeedbackAlertCount > 0) {
                base.badge = effectiveFeedbackAlertCount;
            }
            return base;
        })
    ];

    return (
        <aside
            style={{ width: 'var(--sidebar-w,12rem)' }}
            className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none"
        >
            <AdminRail
                pathname={pathname}
                searchParams={searchParams}
                hostname={hostname}
                customNavItems={customNavItems}
                customHeaderTitle={isDiscovery ? "Discovery Engine" : "Admin Portal"}
                customHomeHref={isDiscovery ? "/admin" : "/admin/dashboard"}
                showThemeToggle={true}
            />
        </aside>
    );
}