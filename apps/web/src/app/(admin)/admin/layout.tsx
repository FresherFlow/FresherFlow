'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from '@/lib/utils/utils';
import AdminBottomNav from '@/lib/navigation/AdminBottomNav';
import { AdminSidebar } from '@/features/admin/layout/AdminSidebar';
import { MobileTopNav } from '@/lib/navigation/MobileTopNav';
import { TopHeaderBar } from '@/lib/navigation/TopHeaderBar';
import LoadingScreen from '@/ui/LoadingScreen';
import { getApiBaseForEndpoint } from '@/lib/api/client';

const ADMIN_FEEDBACK_SEEN_KEY = 'ff_admin_feedback_last_seen_at';
// const ADMIN_ALERT_POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_ALERT_POLL_MS || 180000);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [feedbackAlertCount, setFeedbackAlertCount] = useState(0);
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

    let adminTitle = 'Admin Portal';
    if (isLoginPage) {
        adminTitle = 'Admin Login';
    } else if (pathname.startsWith('/admin')) {
        const segments = pathname.split('/').filter(Boolean);
        const adminPage = segments[1] || 'overview';
        const isCreate = segments.includes('create');
        const isEdit = segments.includes('edit');
        
        if (adminPage === 'dashboard' || adminPage === 'overview') adminTitle = 'Dashboard';
        else if (adminPage === 'opportunities') {
            if (isCreate) adminTitle = 'New Listing';
            else if (isEdit) adminTitle = 'Edit Listing';
            else adminTitle = 'Listings';
        }
        else if (adminPage === 'resources') adminTitle = 'Resources';
        else if (adminPage === 'push') adminTitle = 'Push Notifications';
        else if (adminPage === 'captions') adminTitle = 'Captions';
        else if (adminPage === 'feedback') adminTitle = 'Feedback';
        else if (adminPage === 'settings') adminTitle = 'Settings';
        else if (adminPage === 'discovery') adminTitle = 'Discovery Engine';
        else if (adminPage === 'users') adminTitle = 'Users';
        else adminTitle = adminPage.charAt(0).toUpperCase() + adminPage.slice(1).toLowerCase();
    }

    useEffect(() => {
        const titleToSet = `${adminTitle} - Admin`;
        document.title = titleToSet;

        const observer = new MutationObserver(() => {
            if (document.title !== titleToSet) {
                document.title = titleToSet;
            }
        });
        
        const head = document.querySelector('head');
        if (head) {
            observer.observe(head, { childList: true, subtree: true, characterData: true });
        }
        
        return () => observer.disconnect();
    }, [pathname, isLoginPage, adminTitle]);

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

    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            {/* Sidebar (Desktop) */}
            <AdminSidebar feedbackAlertCount={feedbackAlertCount} />
            <TopHeaderBar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background md:bg-muted/10 md:pl-[var(--sidebar-w,12rem)] transition-[padding-left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]">
                <MobileTopNav />

                <main className="flex-1 h-full min-w-0 min-h-0 flex flex-col overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-[4.5rem] md:px-4 md:pb-4">
                    <div className="w-full h-full flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        {children}
                    </div>
                </main>
                <AdminBottomNav />
            </div>
        </div>
    );
}
