import type { ComponentType } from 'react';
import {
    LayoutDashboard,
    Briefcase,
    MessageSquareText,
    ShieldCheck,
    Settings,
    Share2,
    BookOpen,
    Bell,
    CirclePlus,
    ListTodo,
    Users,
    BadgeCheck,
    Building2,
    Cpu,
    ChartBar,
    Search,
    Globe,
    ChevronLeft,
    Flag,
} from 'lucide-react';
import type { SpaceNavGroup } from '@/features/navigation/navConfig';

export type AdminNavIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type AdminNavBadge = string | number;

export type AdminNavSubItem = {
    title: string;
    href: string;
    icon?: AdminNavIcon;
    badge?: AdminNavBadge;
    exact?: boolean;
    /** Permission key gating this row for moderator sessions (see moderatorAccess). */
    permission?: string;
};

export type AdminNavLinkData = {
    title: string;
    href: string;
    icon: AdminNavIcon;
    badge?: AdminNavBadge;
    exact?: boolean;
    /** Legacy affordance: MobileNavMenu renders a trailing chevron for these. */
    hasSubmenu?: boolean;
    /** Permission key gating this row for moderator sessions (see moderatorAccess). */
    permission?: string;
    items?: never;
};

export type AdminNavCollapsibleData = {
    title: string;
    icon: AdminNavIcon;
    badge?: AdminNavBadge;
    items: AdminNavSubItem[];
    href?: never;
};

export type AdminNavItemData = AdminNavLinkData | AdminNavCollapsibleData;

export type AdminNavGroupData = {
    title: string;
    items: AdminNavItemData[];
};

/** The seven `?tab=` Discovery views, nested under the Discovery Engine parent. */
export const adminDiscoverySubItems: AdminNavSubItem[] = [
    { title: 'Dashboard', href: '/admin/discovery?tab=dashboard', icon: ChartBar },
    { title: 'Discovery Runs', href: '/admin/discovery?tab=runs', icon: ListTodo },
    { title: 'Discovered Jobs', href: '/admin/discovery?tab=discovered', icon: Search },
    { title: 'Processed Jobs', href: '/admin/discovery?tab=processed', icon: BadgeCheck },
    { title: 'Target Companies', href: '/admin/discovery?tab=companies', icon: Building2 },
    { title: 'ATS Adapters', href: '/admin/discovery?tab=adapters', icon: Cpu },
    { title: 'Job Boards', href: '/admin/discovery?tab=boards', icon: Globe },
];

/**
 * Overview group: same destinations, hrefs, icons, and `exact` flags as before.
 * `Discovery Engine` is a collapsible parent holding every Discovery route as a
 * sub-item — the shadcn-admin nested-group pattern (`Auth`, `Errors`,
 * `Settings`) — so the whole Discovery workspace is reachable from the one rail
 * instead of swapping the entire sidebar on `/admin/discovery`.
 */
export const adminOverviewItems: AdminNavItemData[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Listings', href: '/admin/opportunities', icon: Briefcase, exact: true, permission: 'opportunity.review' },
    { title: 'Profile Pages', href: '/admin/profile-pages', icon: Users },
    { title: 'Submissions', href: '/admin/community-submissions', icon: ListTodo, permission: 'community.moderate' },
    { title: 'Reports', href: '/admin/reports', icon: Flag, permission: 'report.resolve' },
    { title: 'Users & moderators', href: '/admin/users', icon: Users },
    { title: 'Audit log', href: '/admin/audit', icon: BadgeCheck },
    { title: 'New listing', href: '/admin/opportunities/create', icon: CirclePlus, permission: 'opportunity.create' },
    { title: 'Discovery Engine', icon: ShieldCheck, items: adminDiscoverySubItems },
];

/** Manage group: the Feedback item receives `feedbackBadge` at group-build time. */
export const adminManageItems: AdminNavLinkData[] = [
    { title: 'Resources', href: '/admin/resources', icon: BookOpen },
    { title: 'Rooms', href: '/admin/rooms', icon: Building2 },
    { title: 'Captions', href: '/admin/captions', icon: Share2 },
    { title: 'Push Alerts', href: '/admin/push', icon: Bell },
    { title: 'Feedback', href: '/admin/feedback', icon: MessageSquareText },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
];

/**
 * Legacy flat Discovery list (Back link + the seven views). Kept for
 * `MobileNavMenu` and `AdminCommandMenu`, which render a flat list — derived
 * from `adminDiscoverySubItems` so the hrefs cannot drift.
 */
export const adminDiscoveryItems: AdminNavLinkData[] = [
    { title: 'Back to Admin', href: '/admin/dashboard', icon: ChevronLeft },
    ...adminDiscoverySubItems.map((item) => ({
        ...item,
        icon: item.icon ?? ShieldCheck,
    })),
];

export function getAdminSidebarGroups(
    _pathname: string,
    feedbackBadge: number,
    moderatorPermissions?: string[] | null,
): {
    groups: AdminNavGroupData[];
    headerTitle: string;
    homeHref: string;
} {
    const visible = (permission?: string): boolean =>
        moderatorPermissions == null || (permission != null && moderatorPermissions.includes(permission));
    const filterItems = <T extends { permission?: string; items?: AdminNavSubItem[] }>(items: T[]): T[] =>
        items.flatMap((item) => {
            if (item.items) {
                const subs = item.items.filter((sub) => visible(sub.permission));
                if (subs.length === 0) return [];
                return [{ ...item, items: subs }];
            }
            return visible(item.permission) ? [item] : [];
        });
    // One rail everywhere: Discovery lives in a collapsible submenu rather than
    // a separate sidebar mode, so the groups no longer depend on the route.
    return {
        groups: [
            { title: 'Overview', items: filterItems(adminOverviewItems) },
            {
                title: 'Manage',
                items: filterItems(adminManageItems).map((item) =>
                    item.title === 'Feedback' && feedbackBadge > 0
                        ? { ...item, badge: feedbackBadge }
                        : item,
                ),
            },
        ].filter((group) => group.items.length > 0),
        headerTitle: moderatorPermissions == null ? 'Admin Portal' : 'Moderation',
        homeHref: '/admin/dashboard',
    };
}

/**
 * Legacy `{ href, label, icon }` shape. Kept for MobileNavMenu (it maps
 * `item.label`, reads `item.exact` / `item.hasSubmenu`) and AdminCommandMenu.
 * Derived from the canonical items above so hrefs cannot drift.
 */
export type AdminLegacyNavItem = {
    href: string;
    label: string;
    icon: AdminNavIcon;
    exact?: boolean;
    hasSubmenu?: boolean;
    permission?: string;
};

function toLegacyItem(item: AdminNavLinkData): AdminLegacyNavItem {
    const legacy: AdminLegacyNavItem = { href: item.href, label: item.title, icon: item.icon };
    if (item.exact) legacy.exact = true;
    if (item.hasSubmenu) legacy.hasSubmenu = true;
    if (item.permission) legacy.permission = item.permission;
    return legacy;
}

/**
 * Flat legacy list. Collapsible parents (Discovery Engine) are flattened into
 * their children so `MobileNavMenu` and `AdminCommandMenu` — which render a
 * flat list — still surface every destination.
 */
function flattenLegacy(items: AdminNavItemData[]): AdminLegacyNavItem[] {
    return items.flatMap((item) => {
        if (item.items) {
            return item.items.map((sub) => {
                const legacy: AdminLegacyNavItem = {
                    href: sub.href,
                    label: sub.title,
                    icon: sub.icon ?? ShieldCheck,
                };
                if (sub.exact) legacy.exact = true;
                if (sub.permission) legacy.permission = sub.permission;
                return legacy;
            });
        }
        return [toLegacyItem(item)];
    });
}

export const mainNavItems: AdminLegacyNavItem[] = flattenLegacy(adminOverviewItems);
export const settingsNavItems: AdminLegacyNavItem[] = adminManageItems.map(toLegacyItem);
export const discoveryNavItems: AdminLegacyNavItem[] = adminDiscoveryItems.map(toLegacyItem);

/**
 * Top-level Overview rows for the command palette: collapsible parents stay
 * as ONE row (Discovery Engine → `/admin/discovery`) instead of being
 * flattened into their children. `flattenLegacy` above fans the children out
 * for the mobile drawer — using it in the palette too listed every Discovery
 * view twice (once under Overview, once under Discovery).
 */
export const overviewCommandItems: AdminLegacyNavItem[] = adminOverviewItems.map((item) =>
    item.items
        ? { href: '/admin/discovery', label: item.title, icon: item.icon, hasSubmenu: true }
        : toLegacyItem(item),
);

/**
 * Adapter for the mobile drawer, which still renders through `NavMain`
 * (it lives outside the desktop `SidebarProvider`, so it cannot use the
 * sidebar-state-aware `AdminNavGroup`). The drawer lists links only, so a
 * collapsible parent is flattened into its children rather than dropped —
 * otherwise the mobile drawer would lose every Discovery route.
 */
export function toSpaceNavGroups(groups: AdminNavGroupData[]): SpaceNavGroup[] {
    return groups.map((group) => ({
        label: group.title,
        items: group.items.flatMap((item) => {
            if (item.items) {
                return item.items.map((sub) => ({
                    title: sub.title,
                    href: sub.href,
                    icon: sub.icon ?? ShieldCheck,
                    exact: sub.exact,
                    badge: typeof sub.badge === 'number' ? sub.badge : undefined,
                }));
            }
            return [
                {
                    title: item.title,
                    href: item.href,
                    icon: item.icon,
                    exact: item.exact,
                    badge: typeof item.badge === 'number' ? item.badge : undefined,
                },
            ];
        }),
    }));
}
