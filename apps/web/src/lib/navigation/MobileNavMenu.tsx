'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import ArrowRightOnRectangleIcon from '@heroicons/react/24/outline/ArrowRightOnRectangleIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import { Sun as SunIcon, Moon as MoonIcon, Monitor as MonitorIcon } from 'lucide-react';
import type { User } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { LogoImage } from './LogoImage';
import { useTheme } from '@/lib/providers/ThemeContext';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { ResponsivePopover } from '@/ui/ResponsivePopover';
import { useInstallPrompt } from '@/lib/providers/InstallPromptContext';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChartBarIcon from '@heroicons/react/24/outline/ChartBarIcon';
import QueueListIcon from '@heroicons/react/24/outline/QueueListIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import CpuChipIcon from '@heroicons/react/24/outline/CpuChipIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import { getNavContext, getNavItemsForContext } from './navConfig';
import { mainNavItems, settingsNavItems } from '@/features/admin/layout/AdminSidebar';

function TelegramIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M12 0C5.371 0 0 5.372 0 12s5.371 12 12 12 12-5.372 12-12S18.629 0 12 0Zm5.861 8.233-1.97 9.294c-.149.657-.538.818-1.088.51l-3.009-2.219-1.451 1.396c-.16.16-.295.295-.603.295l.213-3.049 5.549-5.012c.24-.213-.053-.333-.373-.12L8.27 13.65l-2.957-.922c-.642-.203-.656-.642.135-.949l11.557-4.456c.536-.198 1.006.12.856.91Z" /></svg>;
}
function LinkedInIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M20.447 20.452h-3.554V14.87c0-1.332-.026-3.046-1.858-3.046-1.86 0-2.145 1.45-2.145 2.95v5.678H9.338V9h3.414v1.561h.049c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126ZM7.114 20.452H3.558V9h3.556v11.452ZM22.225 0H1.771C.792 0 0 .773 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .773 23.2 0 22.222 0h.003Z" /></svg>;
}
function XIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.188L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" /></svg>;
}
function InstagramIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M7.75 2h8.5A5.756 5.756 0 0 1 22 7.75v8.5A5.756 5.756 0 0 1 16.25 22h-8.5A5.756 5.756 0 0 1 2 16.25v-8.5A5.756 5.756 0 0 1 7.75 2Zm-.25 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.75 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>;
}

function WhatsAppIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .14 5.34.14 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.63a11.84 11.84 0 0 0 5.81 1.49h.01c6.57 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.17-3.48-8.45ZM12.07 21.8h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.84 9.84 0 0 1-1.5-5.26c0-5.44 4.42-9.87 9.86-9.87 2.63 0 5.1 1.02 6.96 2.9a9.78 9.78 0 0 1 2.89 6.97c0 5.44-4.42 9.88-9.85 9.88Zm5.42-7.41c-.3-.15-1.79-.88-2.07-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.48a8.96 8.96 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.25-.6-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.5s1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.08 4.48.71.3 1.27.48 1.7.61.72.23 1.38.2 1.89.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" /></svg>;
}

function DiscordIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
        </svg>
    );
}

interface MobileNavMenuProps {
    user: User | null;
    unreadCount: number;
    pendingSyncCount: number;
    onClose: () => void;
}

export default function MobileNavMenu({ user, unreadCount, pendingSyncCount, onClose }: MobileNavMenuProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { canInstall, promptInstall } = useInstallPrompt();

    const socialLinks = [
        { href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D', label: 'WhatsApp', Icon: WhatsAppIcon },
        { href: 'https://t.me/fresherflowin', label: 'Telegram', Icon: TelegramIcon },
        { href: 'https://www.linkedin.com/company/fresherflow-in', label: 'LinkedIn', Icon: LinkedInIcon },
        { href: 'https://x.com/Fresherflow', label: 'X', Icon: XIcon },
        { href: 'https://discord.gg/CcPAnWSHD', label: 'Discord', Icon: DiscordIcon },
        { href: 'https://instagram.com/fresherflow', label: 'Instagram', Icon: InstagramIcon },
    ];

    const isAdmin = pathname.startsWith('/admin');
    let navContext = getNavContext(pathname);
    let navItems: any[];

    if (isAdmin) {
        if (pathname.startsWith('/admin/discovery')) {
            navContext = 'admin' as any;
            navItems = [
                { name: '< Back to Admin', href: '/admin/dashboard', icon: ChevronLeftIcon },
                { name: 'Dashboard', href: '/admin/discovery?tab=dashboard', icon: ChartBarIcon },
                { name: 'Discovery Runs', href: '/admin/discovery?tab=runs', icon: QueueListIcon },
                { name: 'Discovered Jobs', href: '/admin/discovery?tab=discovered', icon: MagnifyingGlassIcon },
                { name: 'Processed Jobs', href: '/admin/discovery?tab=processed', icon: CheckCircleIcon },
                { name: 'Target Companies', href: '/admin/discovery?tab=companies', icon: BuildingOfficeIcon },
                { name: 'ATS Adapters', href: '/admin/discovery?tab=adapters', icon: CpuChipIcon },
                { name: 'Job Boards', href: '/admin/discovery?tab=boards', icon: GlobeAltIcon },
            ];
        } else {
            navContext = 'admin' as any;
            navItems = [
                ...mainNavItems.map(item => ({ ...item, name: item.label, href: item.href, icon: item.icon })),
                ...settingsNavItems.map(item => ({ ...item, name: item.label, href: item.href, icon: item.icon }))
            ];
        }
    } else {
        navItems = getNavItemsForContext(navContext);
    }

    const isAppHost = typeof window !== 'undefined' && (window.location.hostname.startsWith('app.') || window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.'));
    const homeHref = isAppHost ? '/dashboard' : '/';
    navItems = navItems.map(item => item.name === 'Home' ? { ...item, href: homeHref } : item);

    const renderMenuItem = (item: any) => {
        let isActive = false;
        const [itemPath, itemQuery] = item.href.split('?');
        if (itemQuery) {
            const itemParams = new URLSearchParams(itemQuery);
            let match = true;
            itemParams.forEach((val, key) => {
                if (searchParams?.get(key) !== val) match = false;
            });
            isActive = pathname === itemPath && match;
        } else if (item.href === '/jobs') {
            isActive = pathname === '/jobs' && !searchParams?.get('type') && !searchParams?.get('mode') && !searchParams?.get('source') && !searchParams?.get('sort') && !searchParams?.get('filter');
        } else {
            if ('exact' in item && item.exact) {
                isActive = pathname === item.href;
            } else {
                isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
            }
        }
        
        const isAlerts = item.href === '/alerts' || item.name === 'Alerts';

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                    "relative flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm transition-all duration-150 ease-out active:scale-[0.97] group overflow-hidden",
                    isActive
                        ? "bg-foreground/10 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                )}
            >
                <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-foreground stroke-2" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className={cn("truncate whitespace-nowrap", isActive && "font-semibold tracking-tight")}>{item.name}</span>
                {Boolean(item.hasSubmenu) && (
                    <ChevronRightIcon className="w-4 h-4 ml-auto text-muted-foreground/50 shrink-0" />
                )}
                {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-foreground" />
                )}
                {isAlerts && unreadCount > 0 && (
                    <span className={cn(
                        "ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold leading-none",
                        isActive ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                    )}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                {isAlerts && pendingSyncCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none shadow-sm">
                        {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / Brand Area */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <LogoImage width={32} height={32} className="w-8 h-8 object-contain shrink-0" />
                        <span className="text-base font-bold tracking-tight leading-none text-foreground">FresherFlow</span>
                    </div>
                    
                    {/* Big invisible touch target for the close button */}
                    <button 
                        onClick={onClose} 
                        aria-label="Close menu" 
                        className="relative p-4 -mr-4 -my-4 group focus:outline-none"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground transition-all duration-150 ease-out group-active:scale-[0.90]">
                            <XMarkIcon className="w-5 h-5" />
                        </div>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                    <div className="space-y-1">
                        {(navContext as string) !== 'default' && (navContext as string) !== 'admin' && (navContext as string) !== 'moderator' && (
                            <Link
                                href={homeHref}
                                onClick={onClose}
                                className="flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] group text-muted-foreground hover:bg-muted/50 hover:text-foreground mb-1"
                            >
                                <ChevronLeftIcon className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-foreground" />
                                <span className="font-semibold tracking-tight">
                                    {navContext === 'account' ? 'Account' : navContext === 'government' ? 'Government' : 'Jobs'}
                                </span>
                            </Link>
                        )}
                        {navItems.map(renderMenuItem)}
                    </div>

                    {!isAdmin && (
                        <>
                            {/* App Install / Get Options */}
                            <div className="space-y-1 border-t border-border/40 pt-4">
                                {canInstall && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            promptInstall('navbar');
                                            onClose();
                                        }}
                                        className="flex items-center gap-3.5 w-full px-3 py-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-all duration-150 ease-out active:scale-[0.97]"
                                    >
                                        <ArrowDownTrayIcon className="w-5 h-5 text-primary" />
                                        <span>Install Web App</span>
                                    </button>
                                )}
                                {pathname !== '/app' && (
                                    <Link
                                        href="/app"
                                        onClick={onClose}
                                        className="flex items-center gap-3.5 w-full px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150 ease-out active:scale-[0.97]"
                                    >
                                        <DevicePhoneMobileIcon className="w-5 h-5 text-muted-foreground" />
                                        <span>Get Android App</span>
                                    </Link>
                                )}
                            </div>

                            <div className="pt-2">
                                <p className="px-3 pb-2 text-[12px] font-bold text-muted-foreground opacity-70">Connect</p>
                                <div className="flex items-center justify-between px-3 gap-1">
                                    {socialLinks.map((s) => (
                                        <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                                            className="h-8 w-8 rounded-lg border border-divider bg-muted/30 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all duration-150 ease-out active:scale-[0.90] hover:shadow-sm shrink-0"
                                            aria-label={s.label}>
                                            <s.Icon className="w-3.5 h-3.5" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {user && !isAdmin && (
                        <div className="pt-4 mt-4 border-t border-border/40">
                            <button onClick={() => { if (logout) void logout('/login'); onClose(); }}
                                className="flex items-center gap-3.5 w-full px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-150 ease-out active:scale-[0.97]" aria-label="Sign Out">
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-border/40 space-y-1">
                        <ThemeSwitcher className="w-full">
                            <button
                                className="flex items-center gap-3.5 w-full px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] group text-muted-foreground hover:bg-muted/50 hover:text-foreground" aria-label="Toggle Theme">
                                {theme === 'dark' ? (
                                    <SunIcon size={20} strokeWidth={1.5} className="transition-colors text-muted-foreground group-hover:text-foreground" />
                                ) : (
                                    <MoonIcon size={20} strokeWidth={1.5} className="transition-colors text-muted-foreground group-hover:text-foreground" />
                                )}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </button>
                        </ThemeSwitcher>
                    </div>
                </nav>
        </div>
    );
}
