import {
    COMMUNITY_GROUP,
    PERSONAL_GROUP,
    SPACES,
    type SpaceId,
    type SpaceNavItem,
} from '@/features/navigation/navSpaces';

/**
 * User-sidebar data file — the exact counterpart of
 * `features/admin/layout/admin-sidebar-data.ts`.
 *
 * Pure data + one builder. No JSX, no hooks: `AppSidebar` calls
 * `getSidebarGroups(...)` and renders the result through `NavGroup`,
 * the same way `AdminSidebar` calls `getAdminSidebarGroups(...)` and
 * renders through `AdminNavGroup`.
 */

export type SidebarNavIcon = SpaceNavItem['icon'];

export type SidebarNavSubItem = {
    title: string;
    href: string;
    icon?: SidebarNavIcon;
    exact?: boolean;
    badge?: number;
};

export type SidebarNavLinkData = {
    title: string;
    href: string;
    icon: SidebarNavIcon;
    exact?: boolean;
    badge?: number;
    items?: never;
};

export type SidebarNavCollapsibleData = {
    title: string;
    icon: SidebarNavIcon;
    href?: never;
    items: SidebarNavSubItem[];
};

export type SidebarNavItemData = SidebarNavLinkData | SidebarNavCollapsibleData;

export type SidebarNavGroupData = {
    title: string;
    items: SidebarNavItemData[];
};

type BuilderOptions = {
    /** Active space (Jobs / Drives / Government). */
    spaceId: SpaceId;
    /** Auth-gated items are filtered out when false. */
    isAuthed: boolean;
    /** Community/Personal groups render only after mount (no flash for logged-out visitors). */
    mounted: boolean;
    /** Live counts keyed by href, e.g. { '/jobs': 1284 }. Overrides static badge. */
    badges?: Record<string, number>;
};

function resolveBadge(item: SpaceNavItem, badges?: BuilderOptions['badges']): number | undefined {
    const live = badges?.[item.href];
    return typeof live === 'number' ? live : item.badge;
}

function toSubItem(item: SpaceNavItem, badges?: BuilderOptions['badges']): SidebarNavSubItem {
    return {
        title: item.title,
        href: item.href,
        icon: item.icon,
        exact: item.exact,
        badge: resolveBadge(item, badges),
    };
}

function toItem(item: SpaceNavItem, badges?: BuilderOptions['badges']): SidebarNavItemData | null {
    if (item.items) {
        // No badge on a collapsible parent. A parent is a disclosure control
        // with no href of its own, and its href is only carried for active
        // matching — resolving a live count against it duplicated the child
        // count on the parent row (e.g. "Jobs 519" above "All Jobs 519").
        return {
            title: item.title,
            icon: item.icon,
            items: item.items.map((sub) => toSubItem(sub, badges)),
        };
    }
    return {
        title: item.title,
        href: item.href,
        icon: item.icon,
        exact: item.exact,
        badge: resolveBadge(item, badges),
    };
}

function toGroup(
    group: { label: string; items: SpaceNavItem[] },
    isAuthed: boolean,
    badges?: BuilderOptions['badges'],
): SidebarNavGroupData | null {
    const items = group.items
        .filter((item) => !(item.requiresAuth && !isAuthed))
        .map((item) => toItem(item, badges))
        .filter((item): item is SidebarNavItemData => item !== null);

    if (items.length === 0) return null;
    return { title: group.label, items };
}

/**
 * All sidebar groups for the current shell state: the active space's groups
 * plus the persistent Community and Personal groups (post-mount only, so
 * logged-out visitors never see auth-gated rows flash in during hydration).
 */
export function getSidebarGroups({
    spaceId,
    isAuthed,
    mounted,
    badges,
}: BuilderOptions): SidebarNavGroupData[] {
    const space = SPACES.find((s) => s.id === spaceId) ?? SPACES[0];
    const groups: SidebarNavGroupData[] = [];

    for (const group of space.groups) {
        const built = toGroup(group, isAuthed, badges);
        if (built) groups.push(built);
    }

    if (mounted) {
        const community = toGroup(COMMUNITY_GROUP, isAuthed, badges);
        if (community) groups.push(community);
        const personal = toGroup(PERSONAL_GROUP, isAuthed, badges);
        if (personal) groups.push(personal);
    }

    return groups;
}
