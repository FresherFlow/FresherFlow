import BellIcon from '@heroicons/react/24/outline/BellIcon';
import {
    HomeIcon,
    BriefcaseIcon,
    BuildingLibraryIcon,
    BuildingOfficeIcon,
    BookmarkIcon,
    BookOpenIcon,
    UserCircleIcon,
    AcademicCapIcon,
    ComputerDesktopIcon,
    MapIcon,
    QueueListIcon,
    ShieldExclamationIcon,
    WrenchScrewdriverIcon,
    CodeBracketIcon,
    ClipboardDocumentCheckIcon,
    BanknotesIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    UserPlusIcon,
    PlusCircleIcon,
    Cog6ToothIcon,
    UserIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import {
    TrainFront,
    Building
} from 'lucide-react';

/** Both @heroicons/react/outline and lucide-react icons accept these. */
export type NavIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

export interface NavItem {
    /** Stable identity. Every array below composes items by id, never by href. */
    id: string;
    name: string;
    href: string;
    icon: NavIcon;
    requiresAuth?: boolean;
    exact?: boolean;
    badge?: number;
    /** This route has a deeper context of its own (rendered as a chevron). */
    hasSubmenu?: boolean;
}

type NavItemDef = Omit<NavItem, 'id'>;

/**
 * The single registry of nav destinations.
 *
 * A destination is declared exactly once here and composed into the arrays
 * below by id. This replaces the previous shape, where four context arrays each
 * re-declared the same hrefs with diverging labels and icons (so `/contribute`
 * existed five times under four different names), and
 * `lib/navigation/spaces.ts` projected those arrays back out by *href string* —
 * meaning a renamed href silently disappeared from the sidebar with no error.
 *
 * Labels that legitimately differ per context get their own id (`jobs` vs
 * `jobsPrivate`) rather than a positional override, so what a link is called is
 * still declarative and greppable.
 */
export const REGISTRY = {
    dashboard: { name: 'Home', href: '/dashboard', icon: HomeIcon },
    jobs: { name: 'All Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
    jobsPrivate: { name: 'Private Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
    internships: { name: 'Internships', href: '/jobs?type=internship', icon: AcademicCapIcon },
    remote: { name: 'Remote', href: '/jobs?mode=remote', icon: ComputerDesktopIcon },
    walkins: { name: 'Walk-ins', href: '/jobs/walkins', icon: MapIcon },
    jobBoards: { name: 'Browse Boards', href: '/jobs/browse', icon: CodeBracketIcon },
    companies: { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    resources: { name: 'Resources', href: '/resources', icon: BookOpenIcon },
    platforms: { name: 'Platforms', href: '/platforms', icon: GlobeAltIcon },
    community: { name: 'Community', href: '/community', icon: UserGroupIcon },
    contribute: { name: 'Post Opportunity', href: '/contribute', icon: PlusCircleIcon },
    govt: { name: 'Government', href: '/govt', icon: BuildingLibraryIcon, hasSubmenu: true },
    govtAll: { name: 'All', href: '/govt', icon: QueueListIcon },
    govtUpsc: { name: 'UPSC', href: '/govt?category=UPSC', icon: BuildingLibraryIcon },
    govtSsc: { name: 'SSC', href: '/govt?category=SSC', icon: ClipboardDocumentCheckIcon },
    govtBanking: { name: 'Banking', href: '/govt?category=Banking', icon: BanknotesIcon },
    govtRailways: { name: 'Railways', href: '/govt?category=Railways', icon: TrainFront },
    govtPsu: { name: 'PSU', href: '/govt?category=State PSC', icon: BuildingOffice2Icon },
    govtDefence: { name: 'Defence', href: '/govt?category=Defence', icon: ShieldCheckIcon },
    govtTeaching: { name: 'Teaching', href: '/govt?category=Teaching', icon: AcademicCapIcon },
    govtPolice: { name: 'Police', href: '/govt?category=Police', icon: ShieldExclamationIcon },
    govtEngineering: { name: 'Engineering', href: '/govt?category=Engineering', icon: WrenchScrewdriverIcon },
    saved: { name: 'Saved', href: '/saved', icon: BookmarkIcon, requiresAuth: true },
    tracker: { name: 'Tracker', href: '/tracker', icon: ChartBarIcon, requiresAuth: true },
    account: { name: 'Account', href: '/account', icon: UserCircleIcon, hasSubmenu: true, requiresAuth: true },
    profile: { name: 'Profile', href: '/profile', icon: UserIcon, requiresAuth: true },
    following: { name: 'Following', href: '/followed-companies', icon: Building, requiresAuth: true },
    referrals: { name: 'Referrals', href: '/referral', icon: UserPlusIcon, requiresAuth: true },
    settings: { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, requiresAuth: true },
    alerts: { name: 'Alerts', href: '/alerts', icon: BellIcon, requiresAuth: true },
} satisfies Record<string, NavItemDef>;

export type NavItemId = keyof typeof REGISTRY;

function nav(id: NavItemId, overrides?: Partial<NavItemDef>): NavItem {
    return { id, ...REGISTRY[id], ...overrides };
}

/** Default (unscoped) nav — the routes that belong to no single space. */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
    nav('dashboard'),
    nav('jobs'),
    nav('community'),
    nav('govt'),
    nav('companies'),
    nav('resources'),
    nav('platforms'),
    nav('saved'),
    nav('tracker'),
    nav('contribute'),
    nav('account'),
];

/** Jobs space nav items */
export const JOBS_NAV_ITEMS: NavItem[] = [
    nav('jobs'),
    nav('internships'),
    nav('remote'),
    nav('walkins'),
    nav('contribute', { name: 'Post a Job' }),
    nav('jobBoards'),
    nav('companies', { name: 'Company' }),
    nav('resources'),
    nav('platforms'),
    nav('govt'),
];

export const GOVT_NAV_ITEMS: NavItem[] = [
    nav('govtAll'),
    nav('govtUpsc'),
    nav('govtSsc'),
    nav('govtBanking'),
    nav('govtRailways'),
    nav('govtPsu'),
    nav('govtDefence'),
    nav('govtTeaching'),
    nav('govtPolice'),
    nav('govtEngineering'),
    nav('jobsPrivate'),
    nav('contribute', { name: 'Post a Job' }),
];

export const ACCOUNT_NAV_ITEMS: NavItem[] = [
    nav('account'),
    nav('profile'),
    nav('tracker'),
    nav('saved'),
    nav('following'),
    nav('referrals'),
    nav('contribute'),
    nav('settings'),
];

/* The retired 4-context model (`getNavContext` / `getNavItemsForContext`, plus a
   `moderator` context pointing at the deleted /captions and /discovery routes)
   used to live here. Its last consumers were MobileBottomTabs and the admin
   `sidebar-content.tsx`; both now use the space model and their own arrays, so
   it is deleted rather than kept as a shim. */
