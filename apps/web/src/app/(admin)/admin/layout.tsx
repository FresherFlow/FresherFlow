'use client';

import { useAdmin } from '@/contexts/AdminContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    ChatBubbleBottomCenterTextIcon,
    PlusCircleIcon,
    ChartBarIcon,
    BellAlertIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    Cog8ToothIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import AdminBottomNav from '@/shared/components/navigation/AdminBottomNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { adminApi } from '@/lib/api/admin';

const ADMIN_FEEDBACK_SEEN_KEY = 'ff_admin_feedback_last_seen_at';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { logout, isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [feedbackAlertCount, setFeedbackAlertCount] = useState(0);

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

        if (pathname.startsWith('/admin/feedback')) {
            const now = new Date().toISOString();
            window.localStorage.setItem(ADMIN_FEEDBACK_SEEN_KEY, now);
            return;
        }

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
        const interval = window.setInterval(() => { void pullFeedbackAlerts(); }, 60000);
        return () => window.clearInterval(interval);
    }, [isAuthenticated, isLoginPage, pathname]);


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
        { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
        { href: '/admin/feedback', label: 'Feedback', icon: ChatBubbleBottomCenterTextIcon },
        { href: '/admin/alerts', label: 'Alerts', icon: BellAlertIcon },
        { href: '/admin/telegram', label: 'Telegram', icon: PaperAirplaneIcon },
        { href: '/admin/settings', label: 'Settings', icon: Cog8ToothIcon },
    ];
    const effectiveFeedbackAlertCount = pathname.startsWith('/admin/feedback') ? 0 : feedbackAlertCount;

    return (
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-card border-r border-border sticky top-0 h-screen hidden md:flex flex-col">
                <div className="p-6 flex items-center justify-between">
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 bg-contain bg-center bg-no-repeat"
                            style={{ backgroundImage: 'var(--logo-image)' }}
                            aria-label="FresherFlow"
                        />
                        <span className="text-lg font-bold tracking-tight text-foreground">FresherFlow <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 tracking-wider">ADMIN</span></span>
                    </Link>
                    <ThemeToggle />
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                {item.label}
                                {item.label === 'Feedback' && effectiveFeedbackAlertCount > 0 && (
                                    <span className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                                        {effectiveFeedbackAlertCount > 99 ? '99+' : effectiveFeedbackAlertCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-border mb-4">
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
                {/* Mobile Header - Fixed at Top with Hide/Show logic */}
                <header
                    className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-20 h-16 transition-all duration-300 translate-y-0 opacity-100"
                >
                    <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 bg-contain bg-center bg-no-repeat"
                            style={{ backgroundImage: 'var(--logo-image)' }}
                            aria-label="FresherFlow"
                        />
                        <span className="text-lg font-bold tracking-tight text-foreground">FresherFlow</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                        </button>
                    </div>
                </header>

                {/* Mobile Hamburger Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 top-16 z-[100] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
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
                    className="flex-1 overflow-y-auto pt-16 p-4 md:p-8 md:pt-8 w-full pb-20 md:pb-8"
                >
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
                <AdminBottomNav />
            </div>
        </div>
    );
}
