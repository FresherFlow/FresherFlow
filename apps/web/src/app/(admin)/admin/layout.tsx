'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    PlusCircleIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    Cog8ToothIcon,
    ShareIcon,
    BookOpenIcon,
    BellAlertIcon,
    ShieldCheckIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    SparklesIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ServerStackIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    CpuChipIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    DocumentTextIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ArrowLeftIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ChevronRightIcon
} from '@heroicons/react/24/outline';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from '@/lib/utils/utils';
import AdminBottomNav from '@/lib/navigation/AdminBottomNav';
import { AdminSidebar } from '@/features/admin/layout/AdminSidebar';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import LoadingScreen from '@/ui/LoadingScreen';
import { getApiBaseForEndpoint } from '@/lib/api/client';
import { useTheme } from '@/lib/providers/ThemeContext';
import { LogoImage } from '@/lib/navigation/LogoImage';

const ADMIN_FEEDBACK_SEEN_KEY = 'ff_admin_feedback_last_seen_at';
// const ADMIN_ALERT_POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_ALERT_POLL_MS || 180000);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { logout, isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [feedbackAlertCount, setFeedbackAlertCount] = useState(0);
    const { theme, toggleTheme } = useTheme();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [apiStatus, setApiStatus] = useState<'live' | 'down' | 'checking'>('checking');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentHash, setCurrentHash] = useState<string>('');

    useEffect(() => {
        const updateHash = () => {
            if (typeof window !== 'undefined') {
                setCurrentHash(window.location.hash);
            }
        };

        updateHash();
        window.addEventListener('hashchange', updateHash);
        return () => window.removeEventListener('hashchange', updateHash);
    }, []);

    // Scroll tracking is disabled per user request to keep navigation constant

    const isLoginPage = pathname.includes('/login');

    // Security: Redirect unauthenticated users
    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isLoginPage) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, isLoading, isLoginPage, router]);

    useEffect(() => {
        if (!isAuthenticated || isLoginPage) return;

        if (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) {
            const now = new Date().toISOString();
            window.localStorage.setItem(ADMIN_FEEDBACK_SEEN_KEY, now);
            return;
        }

        /*
        const pullFeedbackAlerts = async () => {
            const since = window.localStorage.getItem(ADMIN_FEEDBACK_SEEN_KEY);
            if (!since) {
                window.localStorage.setItem(ADMIN_FEEDBACK_SEEN_KEY, new Date().toISOString());
                setFeedbackAlertCount(0);
                return;
            }

            try {
                const response = await adminApi.getFeedbackAlerts(since) as { total: number };
                setFeedbackAlertCount(Math.max(0, Number(response.total || 0)));
            } catch {
                // keep silent; badge is non-critical UI
            }
        };

        void pullFeedbackAlerts();

        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            void pullFeedbackAlerts();
        }, ADMIN_ALERT_POLL_MS);

        const onFocus = () => {
            void pullFeedbackAlerts();
        };
        window.addEventListener('focus', onFocus);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
        */
        return;
    }, [isAuthenticated, isLoginPage, pathname]);

    // Check backend health once on mount
    useEffect(() => {
        if (!isAuthenticated || isLoginPage) return;
        const checkHealth = async () => {
            try {
                const base = getApiBaseForEndpoint('/api/health');
                const res = await fetch(`${base}/api/health`, { method: 'GET', cache: 'no-store' });
                setApiStatus(res.ok ? 'live' : 'down');
            } catch {
                setApiStatus('down');
            }
        };
        void checkHealth();
    }, [isAuthenticated, isLoginPage]);


    if (isLoading) {
        return <LoadingScreen message="Loading admin portal..." />;
    }

    // Don't render admin UI for unauthenticated users (except login page)
    if (!isAuthenticated && !isLoginPage) {
        return null;
    }

    if (isLoginPage) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                {children}
            </div>
        );
    }

    const isDiscoveryContext = pathname.startsWith('/admin/discovery') || pathname.startsWith('/discovery');

    const globalNavItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { href: '/admin/discovery', label: 'Discovery Control', icon: ShieldCheckIcon },
        { href: '/admin/opportunities', label: 'Opportunities', icon: BriefcaseIcon },
        { href: '/admin/opportunities/create', label: 'Post New', icon: PlusCircleIcon },
        { href: '/admin/resources', label: 'Resources', icon: BookOpenIcon },
        { href: '/admin/captions', label: 'Captions', icon: ShareIcon },
        { href: '/admin/push', label: 'Push Notifications', icon: BellAlertIcon },
        { href: '/admin/feedback', label: 'Feedback', icon: ChatBubbleBottomCenterTextIcon },
        { href: '/admin/settings', label: 'Settings', icon: Cog8ToothIcon },
    ];

    const effectiveFeedbackAlertCount = (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) ? 0 : feedbackAlertCount;

    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            {/* Sidebar (Desktop) */}
            <AdminSidebar feedbackAlertCount={feedbackAlertCount} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background md:bg-muted/10">
                {/* Mobile Header */}
                <header
                    className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-end justify-center pb-1.5 pt-[env(safe-area-inset-top)] pointer-events-none"
                    style={{ height: `calc(3.75rem + env(safe-area-inset-top))` }}
                >
                    <div className={`pointer-events-auto mx-2 w-[calc(100%-16px)] h-12 rounded-2xl px-3 flex items-center justify-between gap-2 transition-all duration-300 border border-border/80 bg-card/90 backdrop-blur-md shadow-sm`}>
                        <Link href="/admin/dashboard" className="flex items-center gap-2 min-w-0 pl-0.5">
                            <LogoImage className="w-7 h-7 shrink-0" width={28} height={28} />
                            <span className="text-[15px] font-semibold tracking-[0.01em] text-foreground/95 truncate leading-none">
                                {isDiscoveryContext ? 'Discovery Engine' : 'Admin'}
                            </span>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 ease-out active:scale-[0.95]"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Mobile Hamburger Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-[100] bg-background/60 backdrop-blur-xl flex flex-col animate-in fade-in duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-4 h-16 border-b border-border bg-card/80 backdrop-blur-xl animate-in slide-in-from-top-4 duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]">
                            <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                                <LogoImage className="w-7 h-7 shrink-0" width={28} height={28} />
                                <span className="text-base font-semibold text-foreground">
                                    {isDiscoveryContext ? 'Discovery Engine' : 'Admin Portal'}
                                </span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 ease-out active:scale-[0.95]"
                                    aria-label="Close menu"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Navigation List */}
                        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-card/95">
                            {globalNavItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname === item.href + '/';
                                
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] animate-in fade-in slide-in-from-left-4 fill-mode-backwards ${isActive
                                            ? 'bg-accent text-accent-foreground font-semibold border border-border/50 shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                                        <span>{item.label}</span>
                                        {item.label === 'Feedback' && effectiveFeedbackAlertCount > 0 && (
                                            <span className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                                                {effectiveFeedbackAlertCount > 99 ? '99+' : effectiveFeedbackAlertCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}

                            <div className="pt-4 mt-4 border-t border-border">
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-all duration-200 ease-out active:scale-[0.97]"
                                >
                                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                )}

                <main className="flex-1 h-full min-w-0 min-h-0 flex flex-col overflow-hidden md:p-4">
                    <div className="w-full h-full bg-card rounded-xl border border-border/50 overflow-hidden relative shadow-sm flex flex-col">
                        {children}
                    </div>
                </main>
                <AdminBottomNav />
            </div>
        </div>
    );
}
