import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import type { SVGProps } from 'react';

export type NavRoute = {
    href: string;
    label: string;
    mobileTitle?: string;
    showInDesktop?: boolean;
    showInMobileTabs?: boolean;
    icon?: React.ComponentType<SVGProps<SVGSVGElement>>;
    mobileLabel?: string;
};

export function getNavRoutes(mode: "private" | "govt" = "private"): NavRoute[] {
    if (mode === "govt") {
        return [
            {
                href: '/dashboard',
                label: 'Dashboard',
                mobileTitle: 'Govt Mode',
                mobileLabel: 'Home',
                showInDesktop: true,
                showInMobileTabs: true,
                icon: HomeIcon,
            },
            {
                href: '/jobs',
                label: 'Latest Govt',
                mobileTitle: 'Latest Govt',
                mobileLabel: 'Latest',
                showInDesktop: true,
                showInMobileTabs: true,
                icon: BriefcaseIcon,
            },
            {
                href: '/jobs?sector=central',
                label: 'Central Govt',
                mobileTitle: 'Central Govt',
                mobileLabel: 'Central',
                showInDesktop: true,
                showInMobileTabs: true,
                icon: AcademicCapIcon,
            },
            {
                href: '/jobs?sector=state',
                label: 'State Govt',
                mobileTitle: 'State Govt',
                mobileLabel: 'State',
                showInDesktop: true,
                showInMobileTabs: true,
                icon: AcademicCapIcon,
            },
            {
                href: '/jobs?sector=bank',
                label: 'Bank',
                mobileTitle: 'Bank',
                mobileLabel: 'Bank',
                showInDesktop: true,
                showInMobileTabs: false,
                icon: BriefcaseIcon,
            },
            {
                href: '/jobs?sector=railway',
                label: 'Railway',
                mobileTitle: 'Railway',
                mobileLabel: 'Railway',
                showInDesktop: true,
                showInMobileTabs: false,
                icon: BriefcaseIcon,
            },
            {
                href: '/jobs?sector=defence',
                label: 'Defence',
                mobileTitle: 'Defence',
                mobileLabel: 'Defence',
                showInDesktop: true,
                showInMobileTabs: false,
                icon: BriefcaseIcon,
            },
            {
                href: '/account/saved',
                label: 'Saved',
                mobileTitle: 'Saved',
                showInDesktop: true,
            },
        ];
    }

    return [
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
            mobileTitle: 'Opportunities Feed',
            mobileLabel: 'Feed',
            showInDesktop: true,
            showInMobileTabs: true,
            icon: MagnifyingGlassIcon,
        },
        {
            href: '/jobs',
            label: 'Jobs',
            mobileTitle: 'Jobs Feed',
            mobileLabel: 'Jobs',
            showInDesktop: true,
            showInMobileTabs: true,
            icon: BriefcaseIcon,
        },
        {
            href: '/internships',
            label: 'Internships',
            mobileTitle: 'Internships Feed',
            mobileLabel: 'Internships',
            showInDesktop: true,
            showInMobileTabs: true,
            icon: AcademicCapIcon,
        },
        {
            href: '/remote',
            label: 'Remote',
            mobileTitle: 'Remote Jobs Feed',
            mobileLabel: 'Remote',
            showInDesktop: true,
            showInMobileTabs: true,
            icon: BriefcaseIcon,
        },
        {
            href: '/government-jobs',
            label: 'Govt Jobs',
            mobileTitle: 'Govt Jobs',
            mobileLabel: 'Govt Jobs',
            showInDesktop: true,
            showInMobileTabs: true,
            icon: BuildingLibraryIcon,
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
}
