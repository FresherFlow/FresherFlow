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
    IdentificationIcon,
    MapPinIcon,
    CalendarIcon,
    ClipboardDocumentCheckIcon,
    BanknotesIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    UserPlusIcon,
    PlusCircleIcon,
    Cog6ToothIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    BellAlertIcon,
    UserIcon,
    BuildingOffice2Icon,
    LinkIcon,
    UserGroupIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import {
    TrainFront,
    Building
} from 'lucide-react';

export const DEFAULT_NAV_ITEMS = [
    { name: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
    { name: 'Government', href: '/govt', icon: BuildingLibraryIcon, hasSubmenu: true },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Resources', href: '/resources', icon: BookOpenIcon },
    { name: 'Saved', href: '/saved', icon: BookmarkIcon },
    { name: 'Tracker', href: '/tracker', icon: ChartBarIcon },
    { name: 'Account', href: '/account', icon: UserCircleIcon, hasSubmenu: true },
];

export const JOBS_NAV_ITEMS = [
    { name: 'All Jobs', href: '/jobs', icon: BriefcaseIcon },
    { name: 'Internships', href: '/jobs?type=internship', icon: AcademicCapIcon },
    { name: 'Remote', href: '/jobs?mode=remote', icon: ComputerDesktopIcon },
    { name: 'Walk-ins', href: '/jobs?type=walkin', icon: MapIcon },
    { name: 'Closing Soon', href: '/jobs?sort=expiring', icon: BellAlertIcon },
    { name: 'Latest', href: '/jobs?sort=latest', icon: ClockIcon },
    { name: 'Trending', href: '/jobs?sort=trending', icon: ArrowTrendingUpIcon },
    { name: 'Skills', href: '/skills', icon: CodeBracketIcon },
    { name: 'Roles', href: '/roles', icon: IdentificationIcon },
    { name: 'Location', href: '/locations', icon: MapPinIcon },
    { name: 'Company', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Batch', href: '/batch', icon: CalendarIcon },
    { name: 'Resources', href: '/resources', icon: BookOpenIcon },
    { name: 'Government', href: '/govt', icon: BuildingLibraryIcon, hasSubmenu: true },
];

export const GOVT_NAV_ITEMS = [
    { name: 'All', href: '/govt', icon: QueueListIcon },
    { name: 'UPSC', href: '/govt?category=UPSC', icon: BuildingLibraryIcon },
    { name: 'SSC', href: '/govt?category=SSC', icon: ClipboardDocumentCheckIcon },
    { name: 'Banking', href: '/govt?category=Banking', icon: BanknotesIcon },
    { name: 'Railways', href: '/govt?category=Railways', icon: TrainFront },
    { name: 'PSU', href: '/govt?category=State PSC', icon: BuildingOffice2Icon },
    { name: 'Defence', href: '/govt?category=Defence', icon: ShieldCheckIcon },
    { name: 'Teaching', href: '/govt?category=Teaching', icon: AcademicCapIcon },
    { name: 'Police', href: '/govt?category=Police', icon: ShieldExclamationIcon },
    { name: 'Engineering', href: '/govt?category=Engineering', icon: WrenchScrewdriverIcon },
    { name: 'Private Jobs', href: '/jobs', icon: BriefcaseIcon, hasSubmenu: true },
];

export const ACCOUNT_NAV_ITEMS = [
    { name: 'Account', href: '/account', icon: UserCircleIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Tracker', href: '/tracker', icon: ChartBarIcon },
    { name: 'Saved', href: '/saved', icon: BookmarkIcon },
    { name: 'Following', href: '/followed-companies', icon: Building },
    { name: 'Referrals', href: '/referral', icon: UserPlusIcon },
    { name: 'Contributions', href: '/contribute', icon: PlusCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function getNavContext(pathname: string): 'default' | 'account' | 'government' | 'jobs' | 'moderator' {
    if (pathname.startsWith('/captions') || pathname.startsWith('/discovery')) {
        return 'moderator';
    }
    if (
        pathname.startsWith('/account') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/alerts') ||
        pathname.startsWith('/notifications') ||
        pathname.startsWith('/followed-companies') ||
        pathname.startsWith('/referral') ||
        pathname.startsWith('/contribute')
    ) {
        return 'account';
    } else if (pathname.startsWith('/govt')) {
        return 'government';
    } else if (
        pathname.startsWith('/jobs') ||
        pathname.startsWith('/off-campus') ||
        pathname.startsWith('/skills') ||
        pathname.startsWith('/roles') ||
        pathname.startsWith('/locations') ||
        pathname.startsWith('/batch')
    ) {
        return 'jobs';
    }
    return 'default';
}

export function getNavItemsForContext(context: 'default' | 'account' | 'government' | 'jobs' | 'moderator') {
    switch (context) {
        case 'account': return ACCOUNT_NAV_ITEMS;
        case 'government': return GOVT_NAV_ITEMS;
        case 'jobs': return JOBS_NAV_ITEMS;
        case 'moderator': return [
            { name: 'Captions', href: '/captions', icon: ShareIcon }, 
            { name: 'Discovery Engine', href: '/discovery', icon: ShieldCheckIcon, hasSubmenu: true }
        ];
        default: return DEFAULT_NAV_ITEMS;
    }
}

export const RESOURCES_NAV_ITEMS = [
    { name: 'Career Resources', href: '/resources', icon: BuildingLibraryIcon },
    { name: 'Submit Job Link', href: '/contribute', icon: LinkIcon, requiresAuth: true },
    { name: 'Invite Friends', href: '/referral', icon: UserGroupIcon, requiresAuth: true },
];
