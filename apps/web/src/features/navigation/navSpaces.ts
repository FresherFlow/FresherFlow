import { Briefcase, Landmark, Map, CircleUser } from 'lucide-react';
import type { NavIcon, NavItem, NavItemId } from './navRegistry';
import { ACCOUNT_NAV_ITEMS, COMMUNITY_NAV_ITEMS, DEFAULT_NAV_ITEMS, DRIVES_NAV_ITEMS, GOVT_NAV_ITEMS, JOBS_NAV_ITEMS, REGISTRY } from './navRegistry';

/* ────────────────────────────────────────────────────────────────────────────
   Space model (Jobs / Government).

   This used to live in lib/navigation/spaces.ts, whose only job was to project
   these two spaces back out of the arrays above by href. It is folded in here
   so navConfig stays the single source of nav data and there is no second file
   to keep in sync.
   ──────────────────────────────────────────────────────────────────────────── */

export type SpaceId = 'jobs' | 'drives' | 'govt';

export interface SpaceNavItem {
    title: string;
    href: string;
    icon: NavIcon;
    exact?: boolean;
    badge?: number;
    hasSubmenu?: boolean;
    requiresAuth?: boolean;
    /**
     * Nested routes. When present the row is a collapsible parent — the
     * shadcn-admin `NavCollapsible` shape, same as the admin rail's Discovery
     * Engine: the row opens a `SidebarMenuSub` instead of navigating, and
     * `href` is kept only for active matching.
     */
    items?: SpaceNavItem[];
}

export interface SpaceNavGroup {
    label: string;
    items: SpaceNavItem[];
}

export interface Space {
    id: SpaceId;
    name: string;
    subtitle: string;
    icon: NavIcon;
    /**
     * Where switching into this space lands. The space switcher must follow
     * the switch, and each space owns its own entry route — hardcoding
     * `/jobs` for "everything else" left Drives switching while still on
     * `/jobs`.
     */
    homeHref: string;
    groups: SpaceNavGroup[];
}

function nav(id: NavItemId): NavItem {
    return { id, ...REGISTRY[id] };
}

function toSpaceItem(item: NavItem): SpaceNavItem {
    return {
        title: item.name,
        href: item.href,
        icon: item.icon,
        exact: item.exact,
        badge: item.badge,
        hasSubmenu: item.hasSubmenu,
        requiresAuth: item.requiresAuth,
    };
}

/**
 * Pick items out of a context array by id, preserving that array's order and
 * its per-context label overrides. Lookup is by id, not href, so renaming a
 * destination's href can no longer make it silently vanish.
 */
function pick(source: NavItem[], ...ids: NavItemId[]): SpaceNavItem[] {
    return ids
        .map((id) => source.find((item) => item.id === id))
        .filter((item): item is NavItem => Boolean(item))
        .map(toSpaceItem);
}

export const SPACES: Space[] = [
    {
        id: 'jobs',
        name: 'Jobs',
        subtitle: 'Private sector',
        icon:    Briefcase,
        homeHref: REGISTRY.dashboard.href,
        groups: [
            {
                label: 'Browse',
                items: [
                    ...pick(JOBS_NAV_ITEMS, 'dashboard'),
                    // The six job-type rows collapse under one `Jobs` parent, so
                    // the rail reads as destinations, not as a facet list.
                    {
                        title: 'Jobs',
                        href: REGISTRY.jobs.href,
                        icon: REGISTRY.jobs.icon,
                        items: pick(JOBS_NAV_ITEMS, 'jobs', 'internships', 'fullTime', 'partTime', 'remote', 'jobBoards'),
                    },
                    ...pick(DEFAULT_NAV_ITEMS, 'saved', 'tracker'),
                ],
            },
            {
                label: 'Discover',
                items: [
                    ...pick(JOBS_NAV_ITEMS, 'companies', 'resources', 'contribute'),
                    ...pick(ACCOUNT_NAV_ITEMS, 'following'),
                ],
            },
        ],
    },
    {
        id: 'drives',
        name: 'Drives',
        subtitle: 'Campus & walk-in',
        icon:    Map,
        homeHref: REGISTRY.drives.href,
        groups: [
            {
                label: 'Browse',
                items: pick(DRIVES_NAV_ITEMS, 'drives', 'offCampus', 'walkins'),
            },
            {
                label: 'Discover',
                items: pick(JOBS_NAV_ITEMS, 'companies', 'resources', 'contribute'),
            },
        ],
    },
    {
        id: 'govt',
        name: 'Government',
        subtitle: 'Sarkari exams',
        icon:    Landmark,
        homeHref: REGISTRY.govt.href,
        groups: [
            {
                // Renamed from `Categories`: `Categories` is now the parent row,
                // so the group label would have repeated it.
                label: 'Government',
                items: [
                    ...pick(GOVT_NAV_ITEMS, 'govtAll'),
                    {
                        title: 'Categories',
                        href: REGISTRY.govt.href,
                        icon: REGISTRY.govt.icon,
                        items: pick(
                            GOVT_NAV_ITEMS,
                            'govtUpsc',
                            'govtSsc',
                            'govtBanking',
                            'govtRailways',
                            'govtPsu',
                            'govtDefence',
                            'govtTeaching',
                            'govtPolice',
                            'govtEngineering',
                            'govtNursing'
                        ),
                    },
                ],
            },
            {
                label: 'More',
                items: pick(GOVT_NAV_ITEMS, 'contribute'),
            },
        ],
    },
];

/**
 * Persistent secondary groups (Sidebar 08 `nav-secondary` pattern).
 * Always visible regardless of active space; auth-gated items are
 * filtered at render time. Community tabs are shown as their own
 * group so the sub-pages stay discoverable.
 */
export const PERSONAL_GROUP: SpaceNavGroup = {
    label: 'Personal',
    items: [
        {
            title: REGISTRY.account.name,
            href: REGISTRY.account.href,
            icon:    CircleUser,
            requiresAuth: true,
            items: pick(ACCOUNT_NAV_ITEMS, 'profile', 'alerts', 'referrals', 'feedback', 'settings', 'appearance'),
        },
    ],
};

export const COMMUNITY_GROUP: SpaceNavGroup = {
    label: 'Community',
    items: pick(COMMUNITY_NAV_ITEMS, 'notifications', 'discussions', 'salary', 'rooms', 'savedSearches'),
};

export function getSpace(id: SpaceId): Space {
    return SPACES.find((space) => space.id === id) ?? SPACES[0];
}

/** Initial team from URL: /govt* selects Government, /drives* selects Drives, everything else Jobs. */
export function getInitialSpace(pathname: string): SpaceId {
    if (pathname.startsWith('/govt')) return 'govt';
    if (pathname.startsWith('/drives') || pathname.startsWith('/off-campus')) return 'drives';
    return 'jobs';
}

/**
 * Pathnames that own a team. Returns the owning team, or null for
 * shared/personal routes where the user's current team wins.
 */
export function getSpaceForPathname(pathname: string): SpaceId | null {
    if (pathname.startsWith('/govt')) return 'govt';
  if (pathname.startsWith('/drives') || pathname.startsWith('/off-campus')) return 'drives';
    if (
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/skills') ||
        pathname.startsWith('/roles') ||
        pathname.startsWith('/locations') ||
        pathname.startsWith('/batch') ||
        pathname.startsWith('/platforms')
    ) {
        return 'jobs';
    }
    return null;
}
