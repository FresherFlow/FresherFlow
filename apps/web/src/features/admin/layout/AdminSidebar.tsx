'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    PlusIcon,
    ShieldCheckIcon,
    ChevronUpDownIcon,
    Cog8ToothIcon,
    ShareIcon,
    BookOpenIcon,
    BellAlertIcon
} from '@heroicons/react/24/outline';
import { MoonIcon, SunIcon, SidebarIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTheme } from '@/lib/providers/ThemeContext';
import { LogoImage } from '@/lib/navigation/LogoImage';

const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
    { href: '/admin/opportunities', label: 'Opportunities', icon: BriefcaseIcon },
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
    const { logout, admin } = useAdmin();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Auto-collapse on small desktop screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024 && window.innerWidth >= 768) {
                setIsCollapsed(true);
            }
        };
        handleResize(); // initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const effectiveFeedbackAlertCount = (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) ? 0 : feedbackAlertCount;

    const renderNavItem = (item: any, index: number) => {
        const Icon = item.icon;
        let isActive = pathname === item.href || pathname === item.href + '/';

        if (item.label === 'Dashboard') {
            isActive = pathname === '/admin/dashboard' || pathname === '/admin' || pathname === '/dashboard';
        } else if (item.label === 'Discovery Engine') {
            isActive = pathname.startsWith('/admin/discovery');
        } else if (item.label === 'Opportunities') {
            isActive = pathname === '/opportunities' || pathname === '/admin/opportunities' || (pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities/create');
        }

        return (
            <Link
                key={item.href}
                href={item.href}
                style={{ animationDelay: `${index * 40}ms` }}
                className={cn(
                    "group flex items-center h-10 rounded-xl text-sm font-medium transition-all duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] animate-in fade-in slide-in-from-left-2 fill-mode-backwards",
                    isCollapsed ? "justify-center w-10 px-0 mx-auto" : "gap-3 px-3 w-full",
                    isActive 
                        ? "bg-accent/80 text-foreground shadow-xs ring-1 ring-border/50" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={isCollapsed ? item.label : undefined}
            >
                <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={isActive ? 2 : 1.75} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                
                {!isCollapsed && item.label === 'Feedback' && effectiveFeedbackAlertCount > 0 && (
                    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {effectiveFeedbackAlertCount > 99 ? '99+' : effectiveFeedbackAlertCount}
                    </span>
                )}
                {isCollapsed && item.label === 'Feedback' && effectiveFeedbackAlertCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
                )}
            </Link>
        );
    };

    return (
        <aside 
            className={cn(
                "hidden md:flex flex-col shrink-0 my-4 ml-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-sm transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] relative z-20 overflow-hidden",
                isCollapsed ? "w-[72px]" : "w-[260px]"
            )}
        >
            {/* Header */}
            <div className={cn("flex items-center h-[72px] shrink-0", isCollapsed ? "justify-center px-0" : "justify-between px-5")}>
                <Link href="/admin/dashboard" className={cn("flex items-center gap-3 transition-opacity", isCollapsed && "hidden")}>
                    <LogoImage className="w-[22px] h-[22px] shrink-0" width={22} height={22} />
                    <span className="text-[16px] font-bold tracking-tight text-foreground leading-none">FresherFlow</span>
                </Link>
                {isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center justify-center">
                        <LogoImage className="w-6 h-6" width={24} height={24} />
                    </Link>
                )}
                <div className={cn("flex items-center gap-1.5", isCollapsed && "hidden")}>
                    <button onClick={toggleTheme} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 ease-out active:scale-[0.95]">
                        {theme === 'dark' ? <MoonIcon className="w-[18px] h-[18px]" /> : <SunIcon className="w-[18px] h-[18px]" />}
                    </button>
                    <button onClick={() => setIsCollapsed(true)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 ease-out active:scale-[0.95]">
                        <SidebarIcon className="w-[18px] h-[18px]" />
                    </button>
                </div>
            </div>

            {/* Collapsed Top Controls (only shown when collapsed) */}
            {isCollapsed && (
                <div className="flex flex-col items-center gap-2 px-2 pb-4 pt-2 border-b border-border/40 animate-in fade-in duration-300">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 ease-out active:scale-[0.95]">
                        {theme === 'dark' ? <MoonIcon className="w-[18px] h-[18px]" /> : <SunIcon className="w-[18px] h-[18px]" />}
                    </button>
                    <button onClick={() => setIsCollapsed(false)} className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 ease-out active:scale-[0.95]">
                        <SidebarIcon className="w-[18px] h-[18px]" />
                    </button>
                </div>
            )}

            {/* Navigation Lists */}
            <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-6 py-5 px-3">
                {/* Main Section */}
                <div className="flex flex-col gap-1">
                    {!isCollapsed && <span className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider animate-in fade-in">Main</span>}
                    {mainNavItems.map((item, index) => renderNavItem(item, index))}
                </div>

                {/* Settings Section */}
                <div className="flex flex-col gap-1">
                    {!isCollapsed && <span className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider animate-in fade-in">Settings</span>}
                    {settingsNavItems.map((item, index) => renderNavItem(item, index + mainNavItems.length))}
                </div>
            </nav>

            {/* Primary Action Button */}
            <div className={cn("px-3 pb-4 pt-2 shrink-0 border-t border-border/40", isCollapsed && "flex justify-center")}>
                <Link 
                    href="/admin/opportunities/create"
                    className={cn(
                        "flex items-center justify-center font-semibold text-black transition-all duration-[200ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-105 active:scale-[0.95] shadow-sm relative overflow-hidden group/new",
                        "bg-[#C3F53C]", // Specific vibrant lime color from screenshot
                        isCollapsed ? "w-11 h-11 rounded-full" : "h-11 w-full gap-2 rounded-xl"
                    )}
                    title={isCollapsed ? "Post New Opportunity" : undefined}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/new:translate-y-[0%] transition-transform duration-[300ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
                    <PlusIcon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                    {!isCollapsed && <span className="relative z-10">Post New</span>}
                </Link>
            </div>

            {/* Account Footer */}
            <div className={cn("p-3 shrink-0", isCollapsed ? "flex justify-center" : "border-t border-border/40")}>
                <button 
                    onClick={logout}
                    className={cn(
                        "flex items-center text-left w-full rounded-xl transition-all duration-200 ease-out hover:bg-muted/50 active:scale-[0.97]",
                        isCollapsed ? "justify-center p-1" : "p-2 gap-3"
                    )}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <div className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-accent text-accent-foreground font-bold shrink-0 ring-1 ring-border shadow-xs">
                        {admin?.fullName?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">{admin?.fullName || 'Admin User'}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{admin?.email}</div>
                            </div>
                            <ChevronUpDownIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
