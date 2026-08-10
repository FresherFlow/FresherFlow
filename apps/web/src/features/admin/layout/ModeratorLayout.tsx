'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SidebarContent } from '@/lib/navigation/AppSidebar';
import { ShieldCheckIcon, ShareIcon, ChartBarIcon, ServerIcon, QueueListIcon, CheckCircleIcon, BuildingOfficeIcon, CpuChipIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { MobileTopNav } from '@/lib/navigation/MobileTopNav';
import { TopHeaderBar } from '@/lib/navigation/TopHeaderBar';

const navItems = [
    { href: '/captions', label: 'Captions', icon: ShareIcon },
    { href: '/discovery', label: 'Discovery Engine', icon: ShieldCheckIcon },
];

export function ModeratorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hostname, setHostname] = useState<string>('');
    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    const [collapsed, setCollapsed] = useState(false);
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

    const isDiscovery = pathname.startsWith('/discovery');
    
    let customNavItems = navItems.map(item => ({ ...item, name: item.label }));
    if (isDiscovery) {
        customNavItems = [
            { name: 'Dashboard', href: '/discovery', icon: ChartBarIcon, exact: true },
            { name: 'Discovery Runs', href: '/discovery?tab=runs', icon: ServerIcon },
            { name: 'Discovered Jobs', href: '/discovery?tab=discovered', icon: QueueListIcon },
            { name: 'Processed Jobs', href: '/discovery?tab=processed', icon: CheckCircleIcon },
            { name: 'Target Companies', href: '/discovery?tab=companies', icon: BuildingOfficeIcon },
            { name: 'ATS Adapters', href: '/discovery?tab=ats', icon: CpuChipIcon },
            { name: 'Job Boards', href: '/discovery?tab=boards', icon: BriefcaseIcon },
        ] as any;
    }

    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-[var(--sidebar-w,12rem)] transition-[width] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)] overflow-hidden">
                <SidebarContent 
                    pathname={pathname} 
                    collapsed={visuallyCollapsed} 
                    onToggleCollapse={handleToggleCollapse} 
                    hostname={hostname}
                    customNavItems={customNavItems}
                    customHeaderTitle={isDiscovery ? "Discovery Engine" : "Moderator Portal"}
                    forceSubContext={isDiscovery}
                    customHomeHref="/discovery"
                    showThemeToggle={true}
                />
            </aside>
            <TopHeaderBar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background md:bg-muted/10 md:pl-[var(--sidebar-w,12rem)] transition-[padding-left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]">
                <MobileTopNav />

                <main className="flex-1 h-full min-w-0 min-h-0 flex flex-col overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-[4.5rem] md:px-4 md:pb-4">
                    <div className="w-full h-full flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
