import { BriefcaseIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import type { NavIcon, NavItem, NavItemId } from './navRegistry';
import { ACCOUNT_NAV_ITEMS, GOVT_NAV_ITEMS, JOBS_NAV_ITEMS, REGISTRY } from './navRegistry';

/* ────────────────────────────────────────────────────────────────────────────
   Space model (Jobs / Government).

   This used to live in lib/navigation/spaces.ts, whose only job was to project
   these two spaces back out of the arrays above by href. It is folded in here
   so navConfig stays the single source of nav data and there is no second file
   to keep in sync.
   ──────────────────────────────────────────────────────────────────────────── */

export type SpaceId = 'jobs' | 'govt';

export interface SpaceNavItem {
    title: string;
    href: string;
    icon: NavIcon;
    exact?: boolean;
    badge?: number;
    hasSubmenu?: boolean;
    requiresAuth?: boolean;
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
        icon: BriefcaseIcon,
        groups: [
            {
                label: 'Browse',
                items: pick(JOBS_NAV_ITEMS, 'jobs', 'internships', 'remote', 'walkins', 'jobBoards'),
            },
            {
                label: 'Discover',
                items: pick(JOBS_NAV_ITEMS, 'companies', 'resources', 'platforms', 'contribute'),
            },
        ],
    },
    {
        id: 'govt',
        name: 'Government',
        subtitle: 'Sarkari exams',
        icon: BuildingLibraryIcon,
        groups: [
            {
                label: 'Categories',
                items: pick(
                    GOVT_NAV_ITEMS,
                    'govtAll',
                    'govtUpsc',
                    'govtSsc',
                    'govtBanking',
                    'govtRailways',
                    'govtPsu',
                    'govtDefence',
                    'govtTeaching',
                    'govtPolice',
                    'govtEngineering'
                ),
            },
            {
                label: 'More',
                items: pick(GOVT_NAV_ITEMS, 'contribute'),
            },
        ],
    },
];

/**
 * Persistent secondary group (Sidebar 08 `nav-secondary` pattern).
 * Always visible regardless of active space; auth-gated items are
 * filtered at render time. `Post Opportunity` lives in the space
 * groups above, so it is intentionally excluded here.
 */
export const SECONDARY_GROUP: SpaceNavGroup = {
    label: 'Personal',
    items: [
        ...pick(ACCOUNT_NAV_ITEMS, 'account', 'profile', 'tracker', 'saved', 'following', 'referrals', 'settings'),
        toSpaceItem(nav('alerts')),
        toSpaceItem(nav('community')),
    ],
};

export function getSpace(id: SpaceId): Space {
    return SPACES.find((space) => space.id === id) ?? SPACES[0];
}

/** Initial team from URL: /govt* selects Government, everything else Jobs. */
export function getInitialSpace(pathname: string): SpaceId {
    return pathname.startsWith('/govt') ? 'govt' : 'jobs';
}

/**
 * Pathnames that own a team. Returns the owning team, or null for
 * shared/personal routes where the user's current team wins.
 */
export function getSpaceForPathname(pathname: string): SpaceId | null {
    if (pathname.startsWith('/govt')) return 'govt';
    if (
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/off-campus') ||
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
