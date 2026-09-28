import {
    Bell,
    MessageSquareText,
    Home,
    Briefcase,
    Landmark,
    Building2,
    Bookmark,
    BookOpen,
    CircleUser,
    GraduationCap,
    Monitor,
    Map,
    MapPin,
    Clock,
    List,
    ShieldAlert,
    Wrench,
    Code,
    ClipboardCheck,
    Banknote,
    ShieldCheck,
    ChartBar,
    UserPlus,
    CirclePlus,
    Settings,
    Palette,
    Heart,
    User,
    Building,
    Users,
    TrainFront,
} from 'lucide-react';

/** lucide-react — same icon set as the admin rail. Accepts these props. */
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
    dashboard: { name: 'For You', href: '/jobs?tab=for-you', icon:    Home },
    jobs: { name: 'All Jobs', href: '/jobs', icon:    Briefcase, hasSubmenu: true },
    jobsPrivate: { name: 'Private Jobs', href: '/jobs', icon:    Briefcase, hasSubmenu: true },
    internships: { name: 'Internships', href: '/jobs?type=internship', icon:    GraduationCap },
    remote: { name: 'Remote', href: '/jobs?mode=remote', icon:    Monitor },
    walkins: { name: 'Walk-ins', href: '/drives/walk-in', icon:    Map },
    // `exact` matters here: without it `/drives` prefix-matches and both this
    // hub and the Walk-ins row light up on /drives/walk-in.
    drives: { name: 'Drives', href: '/drives', icon:    Map, exact: true },
    offCampus: { name: 'Off-Campus', href: '/drives/off-campus', icon:    MapPin, exact: true },
    fullTime: { name: 'Full-Time', href: '/jobs/full-time', icon:    Briefcase, exact: true },
    partTime: { name: 'Part-Time', href: '/jobs/part-time', icon:    Clock, exact: true },
    jobBoards: { name: 'Browse Boards', href: '/jobs/browse', icon:    Code },
    companies: { name: 'Companies', href: '/companies', icon:    Building2 },
    resources: { name: 'Resources', href: '/resources', icon:    BookOpen },
    community: { name: 'Community', href: '/community', icon:    Users },
    contribute: { name: 'Post Opportunity', href: '/contribute', icon:    CirclePlus },
    govt: { name: 'Government', href: '/govt', icon:    Landmark, hasSubmenu: true },
    govtAll: { name: 'All', href: '/govt', icon:    List },
    govtUpsc: { name: 'UPSC', href: '/govt?category=UPSC', icon:    Landmark },
    govtSsc: { name: 'SSC', href: '/govt?category=SSC', icon:    ClipboardCheck },
    govtBanking: { name: 'Banking', href: '/govt?category=Banking', icon:    Banknote },
    govtRailways: { name: 'Railways', href: '/govt?category=Railways', icon: TrainFront },
    // %20 is required: a raw space is invalid in a query string. URLSearchParams
    // decodes it, so active-state matching still compares 'State PSC'.
    govtPsu: { name: 'PSU', href: '/govt?category=State%20PSC', icon:    Building },
    govtDefence: { name: 'Defence', href: '/govt?category=Defence', icon:    ShieldCheck },
    govtTeaching: { name: 'Teaching', href: '/govt?category=Teaching', icon:    GraduationCap },
    govtPolice: { name: 'Police', href: '/govt?category=Police', icon:    ShieldAlert },
    govtEngineering: { name: 'Engineering', href: '/govt?category=Engineering', icon:    Wrench },
    govtNursing: { name: 'Nursing', href: '/govt?category=Nursing', icon:    Heart },
    saved: { name: 'Saved', href: '/jobs?tab=saved', icon:    Bookmark, requiresAuth: true },
    tracker: { name: 'Tracker', href: '/jobs?tab=applied', icon:    ChartBar, requiresAuth: true },
    account: { name: 'Account', href: '/account', icon:    CircleUser, hasSubmenu: true, requiresAuth: true },
    profile: { name: 'Profile', href: '/account?tab=profile', icon:    User, requiresAuth: true },
    following: { name: 'Following', href: '/companies?tab=following', icon: Building, requiresAuth: true },
    referrals: { name: 'Referrals', href: '/account?tab=referral', icon:    UserPlus, requiresAuth: true },
    settings: { name: 'Settings', href: '/account?tab=settings', icon:    Settings, requiresAuth: true },
    appearance: { name: 'Appearance', href: '/account?tab=appearance', icon:    Palette, requiresAuth: true },
    alerts: { name: 'Alerts', href: '/jobs?tab=alerts', icon: Bell, requiresAuth: true },
    notifications: { name: 'Notifications', href: '/jobs?tab=notifications', icon: Bell, requiresAuth: true },
    feedback: { name: 'Feedback', href: '/account?tab=feedback', icon: MessageSquareText, requiresAuth: true },
    discussions: { name: 'Discussions', href: '/community?tab=discussions', icon: MessageSquareText },
    salary: { name: 'Salary & Offers', href: '/community?tab=salary', icon:    Banknote },
    rooms: { name: 'Rooms', href: '/community?tab=rooms', icon:    Users },
    savedSearches: { name: 'Saved Searches', href: '/jobs?tab=searches', icon:    Bookmark },
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
    nav('saved'),
    nav('tracker'),
    nav('contribute'),
    nav('settings'),
    nav('appearance'),
];

/** Jobs space nav items */
export const JOBS_NAV_ITEMS: NavItem[] = [
    nav('dashboard'),
    nav('jobs'),
    nav('internships'),
    nav('fullTime'),
    nav('partTime'),
    nav('remote'),
    nav('contribute', { name: 'Post a Job' }),
    nav('jobBoards'),
    nav('companies', { name: 'Companies' }),
    nav('resources'),
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
    nav('govtNursing'),
    nav('jobsPrivate'),
    nav('contribute', { name: 'Post a Job' }),
];

/**
 * Drive destinations. They are a separate space, not part of the Jobs list:
 * Jobs covers postings you apply to, Drives covers events you attend.
 */
export const DRIVES_NAV_ITEMS: NavItem[] = [
    nav('drives'),
    nav('offCampus'),
    nav('walkins'),
];

/** Community tabs — one entry per /community?tab= row. */
export const COMMUNITY_NAV_ITEMS: NavItem[] = [
    nav('notifications'),
    nav('discussions'),
    nav('salary'),
    nav('rooms'),
    nav('savedSearches'),
];

export const ACCOUNT_NAV_ITEMS: NavItem[] = [
    nav('account'),
    nav('profile'),
    nav('alerts'),
    nav('tracker'),
    nav('saved'),
    nav('following'),
    nav('referrals'),
    nav('contribute'),
    nav('settings'),
    nav('appearance'),
    nav('feedback'),
];

/* The retired 4-context model (`getNavContext` / `getNavItemsForContext`, plus a
   `moderator` context pointing at the deleted /captions and /discovery routes)
   used to live here. Its last consumers were MobileBottomTabs and the admin
   `sidebar-content.tsx`; both now use the space model and their own arrays, so
   it is deleted rather than kept as a shim. */
