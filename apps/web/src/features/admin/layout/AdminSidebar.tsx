'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SidebarContent } from '@/lib/navigation/AppSidebar';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    ShieldCheckIcon,
    Cog8ToothIcon,
    ShareIcon,
    BookOpenIcon,
    BellAlertIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline';

const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
    { href: '/admin/opportunities', label: 'Listings', icon: BriefcaseIcon, exact: true },
    { href: '/admin/opportunities/create', label: 'New listing', icon: PlusCircleIcon },
    { href: '/admin/discovery', label: 'Discovery Engine', icon: ShieldCheckIcon },
];

const settingsNavItems = [
    { href: '/admin/resources', label: 'Resources', icon: BookOpenIcon },
    { href: '/admin/captions', label: 'Captions', icon: ShareIcon },
    { href: '/admin/push', label: 'Push Alerts', icon: BellAlertIcon },
    { href: '/admin/feedback', label: 'Feedback', icon: ChatBubbleBottomCenterTextIcon },
    { href: '/admin/settings', label: 'Settings', icon: Cog8ToothIcon },
];

export function AdminSidebar({
    feedbackAlertCount = 0
}: {
    feedbackAlertCount?: number;
}) {
    const { } = useAdmin();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const [, setCollapsed] = useState(false);
    const [visuallyCollapsed, setVisuallyCollapsed] = useState(false);

    const handleToggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            if (!next) {
                setVisuallyCollapsed(false);
            } else {
                setTimeout(() => setVisuallyCollapsed(true), 600);
            }
            localStorage.setItem('ff:sidebarCollapsed', String(next));
            document.documentElement.style.setProperty('--sidebar-w', next ? '3rem' : '12rem');
            document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
            return next;
        });
    };

    useEffect(() => {
        const stored = localStorage.getItem('ff:sidebarCollapsed');
        const isCol = stored === 'true';
        if (isCol) {
            setCollapsed(true);
            setVisuallyCollapsed(true);
        }
        document.documentElement.style.setProperty('--sidebar-w', isCol ? '3rem' : '12rem');
        document.documentElement.setAttribute('data-sidebar', isCol ? 'collapsed' : 'expanded');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                handleToggleCollapse();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const effectiveFeedbackAlertCount = (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) ? 0 : feedbackAlertCount;

    const customNavItems = [
        ...mainNavItems.map(item => ({ ...item, name: item.label, href: item.href, icon: item.icon })),
        ...settingsNavItems.map(item => {
            const base: any = { name: item.label, href: item.href, icon: item.icon };
            if (item.label === 'Resources') {
                base.isSettingsDivider = true;
            }
            if (item.label === 'Feedback') {
                base.badge = effectiveFeedbackAlertCount;
            }
            return base;
        })
    ];

    return (
        <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-[var(--sidebar-w,12rem)] transition-[width] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)] overflow-hidden">
            <SidebarContent 
                pathname={pathname} 
                searchParams={searchParams} 
                collapsed={visuallyCollapsed} 
                onToggleCollapse={handleToggleCollapse} 
                hostname={hostname}
                customNavItems={customNavItems}
                customHeaderTitle="Admin Portal"
                showThemeToggle={true}
            />
        </aside>
    );
}
