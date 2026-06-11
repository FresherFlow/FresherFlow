'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import PlusCircleIcon from '@heroicons/react/24/outline/PlusCircleIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import ChatBubbleBottomCenterTextIcon from '@heroicons/react/24/outline/ChatBubbleBottomCenterTextIcon';
import BookOpenIcon from '@heroicons/react/24/outline/BookOpenIcon';

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: Squares2X2Icon,
    },
    {
        label: 'Search',
        href: '/admin/opportunities',
        icon: MagnifyingGlassIcon,
    },
    {
        label: 'Post',
        href: '/admin/opportunities/create',
        icon: PlusCircleIcon,
    },
    {
        label: 'Feedback',
        href: '/admin/feedback',
        icon: ChatBubbleBottomCenterTextIcon,
    },
    {
        label: 'Resources',
        href: '/admin/resources',
        icon: BookOpenIcon,
    }
];

export default function AdminBottomNav() {
    const pathname = usePathname();

    // Hide on form pages that have their own bottom action bar
    const isFormPage =
        pathname === '/admin/opportunities/create' ||
        pathname === '/admin/opportunities/new' ||
        pathname === '/admin/government-jobs/create' ||
        pathname === '/admin/jobs/new' ||
        pathname === '/admin/walkins/new' ||
        pathname.includes('/edit') ||
        pathname.includes('/resources');

    if (isFormPage) return null;

    return (
        <nav className={cn(
            "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden transition-all duration-300 pb-safe",
            "translate-y-0 opacity-100"
        )}>
            <div className="flex justify-around items-center h-16 px-2">
                {NAV_ITEMS.map((item) => {
                    let isActive = false;

                    if (item.label === 'Dashboard') {
                        isActive = pathname === '/dashboard' || pathname === '/admin' || pathname === '/admin/dashboard';
                    } else if (item.label === 'Post') {
                        isActive = pathname === '/opportunities/create' || pathname === '/admin/opportunities/create';
                    } else if (item.label === 'Search') {
                        isActive =
                            pathname === '/opportunities' ||
                            (pathname.startsWith('/opportunities/') && pathname !== '/opportunities/create') ||
                            pathname === '/admin/opportunities' ||
                            (pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities/create');
                    } else if (item.label === 'Feedback') {
                        isActive = pathname === '/feedback' || pathname.startsWith('/admin/feedback');
                    } else if (item.label === 'Resources') {
                        isActive = pathname === '/resources' || pathname.startsWith('/admin/resources');
                    }

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 grouping",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all",
                                isActive && "bg-primary/10"
                            )}>
                                <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20 value-icon")} strokeWidth={isActive ? 2 : 1.5} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-all",
                                isActive ? "font-semibold" : "font-normal"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
