'use client';

import { Suspense, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, MobileNav } from '@/lib/navigation/Navigation';
import { Footer } from '@/ui/Footer';
import { MiniFooter } from '@/ui/MiniFooter';
import { cn } from '@/lib/utils/utils';
// WEB PIVOT: keep offline sync code for later, but do not mount it on SEO web.
// import OfflineActionSync from '@/lib/components/OfflineActionSync';
import { AuthContext } from '@/lib/auth/AuthContext';
import { ADMIN_WEB_HOST } from '@/lib/utils/runtimeConfig';

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const normalizedPathname = pathname?.toLowerCase() || '';
    const isAuthRoute = normalizedPathname === '/login' || normalizedPathname === '/register';
    const isAdminHost = process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined' &&
        window.location.hostname.toLowerCase() === ADMIN_WEB_HOST;
    const isAdminRoute = normalizedPathname.startsWith('/admin') || isAdminHost;
    const isCaptionsPage = normalizedPathname.startsWith('/captions');
    const isDiscoveryPage = normalizedPathname.startsWith('/discovery');
    const segments = normalizedPathname.split('/').filter(Boolean);
    const firstSegment = segments[0] || '';
    const reservedSegments = new Set([
        'about', 'alerts', 'api', 'app', 'batch', 'blog', 'captions', 'careers',
        'companies', 'contact', 'dashboard', 'deadlines', 'dev', 'discovery', 'feedback',
        'government-jobs', 'internships', 'jobs', 'join', 'location', 'login',
        'logout', 'opportunities', 'privacy', 'profile', 'r',
        'referral', 'remote', 'roles', 'sentry-example-page', 'skills', 'terms',
        'walk-ins', 'account', 'submit-link', 'admin', 'register'
    ]);

    const isDetailPage =
        /^\/(jobs|internships|walk-ins|government-jobs|opportunities)\/[^/]+/.test(normalizedPathname) ||
        (segments.length === 1 && !reservedSegments.has(firstSegment) && !firstSegment.includes('.'));

    const isJobRelatedPage =
        normalizedPathname.startsWith('/jobs') ||
        normalizedPathname.startsWith('/internships') ||
        normalizedPathname.startsWith('/walk-ins') ||
        normalizedPathname.startsWith('/government-jobs') ||
        normalizedPathname.startsWith('/opportunities') ||
        normalizedPathname.startsWith('/remote') ||
        normalizedPathname.startsWith('/companies') ||
        normalizedPathname.startsWith('/skills') ||
        normalizedPathname.startsWith('/location') ||
        normalizedPathname.startsWith('/batch') ||
        normalizedPathname.startsWith('/roles');

    const isRecruiterRoute = normalizedPathname.startsWith('/recruiter');
    const isPublicProfileRoute = normalizedPathname === '/u';
    const hideNav = isAdminRoute || isCaptionsPage || isDiscoveryPage || isRecruiterRoute || isPublicProfileRoute;
    const isHomePage = pathname === '/';

    const isAccountOrDashboardRoute = normalizedPathname.startsWith('/dashboard') || 
                                      normalizedPathname.startsWith('/profile') || 
                                      normalizedPathname.startsWith('/settings') || 
                                      normalizedPathname.startsWith('/saved') || 
                                      normalizedPathname.startsWith('/tracker') || 
                                      normalizedPathname.startsWith('/alerts') || 
                                      normalizedPathname.startsWith('/notifications') ||
                                      normalizedPathname.startsWith('/account');

    const authContext = useContext(AuthContext);
    const isAuthenticated = !!authContext?.user;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const showFooter = !isAdminRoute && !isAuthRoute && !isCaptionsPage && !isDiscoveryPage && !isRecruiterRoute && !isPublicProfileRoute && !normalizedPathname.startsWith('/u/') && !isAccountOrDashboardRoute && (mounted ? !isAuthenticated : true);

    return (
        <>
            {/* WEB PIVOT: disabled user offline sync to avoid background API calls. */}
            {/* {!isAdminRoute && pathname !== '/' && <OfflineActionSync />} */}
            {!hideNav && (
                <Suspense fallback={null}>
                    <Navbar />
                </Suspense>
            )}

            <main className={cn(
                "relative w-full overflow-x-hidden flex-1 flex flex-col",
                !hideNav && "pt-[calc(3.75rem+env(safe-area-inset-top))]",
                !hideNav && "md:pt-[4.75rem]",
                !hideNav && !isHomePage && (isAccountOrDashboardRoute || (mounted && isAuthenticated)) && "pb-20 md:pb-8",
                !hideNav && !isHomePage && !(isAccountOrDashboardRoute || (mounted && isAuthenticated)) && "pb-4 md:pb-8",
                "min-h-screen"
            )}>
                <div className={cn(
                    "flex-1 flex flex-col"
                )}>
                    {children}
                </div>
            </main>
            {showFooter && (
                <div>
                    {/* Desktop/Tablet View */}
                    <div className="hidden md:block">
                        {(isDetailPage || isJobRelatedPage) ? <MiniFooter /> : <Footer />}
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                        {(isDetailPage || isJobRelatedPage) ? null : <Footer />}
                    </div>
                </div>
            )}
            {!hideNav && (
                <Suspense fallback={null}>
                    <MobileNav />
                </Suspense>
            )}
        </>
    );
}

