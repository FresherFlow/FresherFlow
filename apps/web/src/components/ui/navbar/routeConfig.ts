import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';

export type NavRoute = {
    href: string;
    label: string;
    mobileTitle?: string;
    showInDesktop?: boolean;
    showInMobileTabs?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon?: React.ComponentType<any>;
    mobileLabel?: string;
};

export const NAV_ROUTES: NavRoute[] = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        mobileTitle: 'FresherFlow',
        mobileLabel: 'Home',
        showInDesktop: true,
        showInMobileTabs: true,
        icon: HomeIcon,
    },
    {
        href: '/opportunities',
        label: 'Search',
        mobileTitle: 'Search',
        mobileLabel: 'Search',
        showInDesktop: true,
        showInMobileTabs: true,
        icon: MagnifyingGlassIcon,
    },
    {
        href: '/jobs',
        label: 'Jobs',
        mobileTitle: 'Jobs',
        mobileLabel: 'Jobs',
        showInDesktop: true,
        showInMobileTabs: true,
        icon: BriefcaseIcon,
    },
    {
        href: '/internships',
        label: 'Internships',
        mobileTitle: 'Internships',
        mobileLabel: 'Internships',
        showInDesktop: true,
        showInMobileTabs: true,
        icon: AcademicCapIcon,
    },
    {
        href: '/walk-ins',
        label: 'Walk-ins',
        mobileTitle: 'Walk-ins',
        mobileLabel: 'Walk-ins',
        showInDesktop: true,
        showInMobileTabs: true,
        icon: BriefcaseIcon,
    },
    {
        href: '/account/tracker',
        label: 'Tracker',
        mobileTitle: 'Tracker',
        showInDesktop: true,
    },
    {
        href: '/account/saved',
        label: 'Saved',
        mobileTitle: 'Saved',
        showInDesktop: true,
    },
];
