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
    BellAlertIcon
} from '@heroicons/react/24/outline';
import AdminBottomNav from '@/lib/navigation/AdminBottomNav';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import LoadingScreen from '@/ui/LoadingScreen';
import { getApiBaseForEndpoint } from '@/lib/api/client';
import { useTheme } from '@/lib/providers/ThemeContext';

const ADMIN_FEEDBACK_SEEN_KEY = 'ff_admin_feedback_last_seen_at';
// const ADMIN_ALERT_POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_ALERT_POLL_MS || 180000);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { logout, isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const feedbackAlertCount = 0;
    const { theme, toggleTheme } = useTheme();
    const [apiStatus, setApiStatus] = useState<'live' | 'down' | 'checking'>('checking');

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

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { href: '/admin/opportunities', label: 'Opportunities', icon: BriefcaseIcon },
        { href: '/admin/opportunities/create', label: 'Post New', icon: PlusCircleIcon },
        { href: '/admin/resources', label: 'Resources', icon: BookOpenIcon },
        { href: '/admin/captions', label: 'Captions', icon: ShareIcon },
        { href: '/admin/push', label: 'Push Notifications', icon: BellAlertIcon },
        // { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
        { href: '/admin/feedback', label: 'Feedback', icon: ChatBubbleBottomCenterTextIcon },
        // { href: '/admin/alerts', label: 'Alerts', icon: BellAlertIcon },
        // { href: '/admin/telegram', label: 'Broadcasts', icon: ShareIcon },
        { href: '/admin/settings', label: 'Settings', icon: Cog8ToothIcon },
    ];

    const effectiveFeedbackAlertCount = (pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')) ? 0 : feedbackAlertCount;

    const hideBottomNav =
        pathname === '/admin/opportunities' ||
        pathname === '/admin/opportunities/create' ||
        pathname === '/admin/opportunities/new' ||
        pathname === '/admin/government-jobs/create' ||
        pathname === '/admin/jobs/new' ||
        pathname === '/admin/walkins/new' ||
        pathname.includes('/edit') ||
        pathname.includes('/resources');

    return (
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
            {/* Sidebar (Desktop) */}
            <aside className="w-58 bg-card border-r border-border sticky top-0 h-screen hidden md:flex flex-col flex-shrink-0 transition-all duration-300">
                <div className="px-5 py-6 flex items-center justify-between">
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 bg-contain bg-center bg-no-repeat shrink-0"
                            style={{ backgroundImage: 'var(--logo-image)' }}
                            aria-label="FresherFlow"
                        />
                        <div className="flex flex-col">
                            <span className="text-[17px] font-bold tracking-tight text-foreground leading-none">FresherFlow</span>
                            <span className="text-[11px] font-bold text-muted-foreground capitalize tracking-[0.18em] mt-1.5 opacity-60">Admin Portal</span>
                        </div>
                    </Link>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar pb-6">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        // Robust path matching logic (matching AdminBottomNav behavior)
                        let isActive = pathname === item.href || pathname === item.href + '/';

                        if (item.label === 'Dashboard') {
                            isActive = pathname === '/admin/dashboard' || pathname === '/admin' || pathname === '/dashboard';
                        } else if (item.label === 'Opportunities') {
                            isActive =
                                pathname === '/opportunities' ||
                                pathname === '/admin/opportunities' ||
                                (pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities/create');
                        } else if (item.label === 'Post New') {
                            isActive = pathname === '/admin/opportunities/create' || pathname === '/opportunities/create';
                        } else if (item.label === 'Analytics') {
                            isActive = pathname === '/analytics' || pathname.startsWith('/admin/analytics');
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                    }`}
                            >
                                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground/90'}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="truncate">{item.label}</span>
                                {item.label === 'Feedback' && effectiveFeedbackAlertCount > 0 && (
                                    <span className="ml-auto inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-1">
                                        {effectiveFeedbackAlertCount > 99 ? '99+' : effectiveFeedbackAlertCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-border mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 mb-1">
                        <span className={`relative flex h-2 w-2 ${apiStatus === 'checking' ? '' : ''}`}>
                            {apiStatus === 'live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                apiStatus === 'live' ? 'bg-emerald-500' :
                                apiStatus === 'down' ? 'bg-red-500' :
                                'bg-yellow-400'
                            }`} />
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wider">
                            {apiStatus === 'live' ? 'API Live' : apiStatus === 'down' ? 'API Down' : 'Checking...'}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background md:bg-muted/10">
                {/* Mobile Header */}
                <header
                    className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-end justify-center pb-1.5 pt-[env(safe-area-inset-top)] pointer-events-none"
                    style={{ height: `calc(3.75rem + env(safe-area-inset-top))` }}
                >
                    <div className={`pointer-events-auto mx-2 w-[calc(100%-16px)] h-12 rounded-2xl px-2.5 flex items-center justify-between gap-2 transition-all duration-300 border border-border/80 bg-card/90 backdrop-blur-md shadow-sm`}>
                        <Link href="/admin/dashboard" className="flex items-center gap-2 min-w-0 pl-0.5">
                            <div
                                className="w-6 h-6 bg-contain bg-center bg-no-repeat"
                                style={{ backgroundImage: 'var(--logo-image)' }}
                                aria-label="FresherFlow"
                            />
                            <span className="text-[16px] font-semibold tracking-[0.01em] text-foreground/95 truncate leading-none">
                                Admin
                            </span>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Mobile Hamburger Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200" style={{ top: `calc(3.75rem + env(safe-area-inset-top))` }}>
                        <div className="bg-card border-b border-border shadow-2xl overflow-y-auto max-h-[calc(100vh-4rem)]">
                            <nav className="p-4 space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold transition-all ${isActive
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
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
                                        className="flex items-center gap-4 w-full px-4 py-4 rounded-xl text-base font-bold text-destructive hover:bg-destructive/10 transition-all"
                                    >
                                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>
                )}

                <main
                    className={`flex-1 overflow-hidden flex flex-col p-4 pt-[calc(3.75rem+env(safe-area-inset-top))] md:p-8 md:pt-8 w-full md:pb-8 ${
                        hideBottomNav ? 'pb-4' : 'pb-20'
                    }`}
                >
                    <div className="max-w-[1600px] mx-auto w-full flex-1 min-h-0 overflow-y-auto">
                        {children}
                    </div>
                </main>
                <AdminBottomNav />
            </div>
        </div>
    );
}
