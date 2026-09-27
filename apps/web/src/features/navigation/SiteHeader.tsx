'use client';

import { Suspense, useContext, Fragment, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/lib/auth/AuthContext';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/hooks/useOfflineActionQueue';
import { SidebarTrigger } from '@/ui/sidebar';
import { Separator } from '@/ui/separator';
import { formatSegment, getAdminTitle, isFeedHeaderRoute } from './headerContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';

/**
 * Merged site header for sidebar routes (shadcn-admin `Header` pattern:
 * sticky in-flow at the top of the content column, so it aligns in every
 * sidebar variant with zero offset math). Desktop only; mobile uses
 * MobileTopNav and clears it with top padding.
 */
function SiteHeaderContent() {
    const pathname = usePathname() || '';

    const context = useContext(AuthContext);
    const user = context?.user;
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Mount-gated: SSR and the first client paint must agree on the utility cluster.
    const resolvedUser = mounted ? user : undefined;

    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';
    const isCandidatePortfolioRoute = pathname?.startsWith('/u/');

    if (pathname === '/') return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const isAdminRoute = pathname.startsWith('/admin');
    const adminTitle = isAdminRoute ? getAdminTitle(segments) : '';

    const isFeedRoute = !isAdminRoute && isFeedHeaderRoute(segments);

    return (
        <div
            className="hidden h-14 w-full shrink-0 sticky top-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur-sm z-40 pr-6 pl-4 lg:flex"
        >
            <SidebarTrigger className="-ml-1 h-7 w-7 shrink-0 [&_svg]:size-4!" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex items-center gap-6 min-w-0 flex-1">
                {/* The portal target. Hidden when empty. Serves as a peer. */}
                <div id="top-header-portal-target" className="peer empty:hidden flex items-center gap-6 w-full relative" />

                {/* Fallback for pages that do not inject into this portal */}
                <div className="hidden peer-empty:flex items-center gap-6 w-full" id="top-header-fallback">
                    {isFeedRoute ? (
                        <>
                            <div className="flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap">
                                Home
                                <svg className="w-4 h-4 mx-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                <span className="text-foreground">{formatSegment(segments[segments.length - 1])}</span>
                            </div>
                            <div className="relative group w-full max-w-xl mx-auto flex-1 lg:ml-6 hidden lg:block">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <div className="pl-9 h-9 rounded-xl bg-card border border-border shadow-sm w-full" />
                            </div>
                        </>
                    ) : isAdminRoute ? (
                        <div className="text-lg font-semibold text-foreground truncate">{adminTitle}</div>
                    ) : (
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                </BreadcrumbItem>
                                {segments.map((segment, index) => {
                                    const isLast = index === segments.length - 1;
                                    const href = '/' + segments.slice(0, index + 1).join('/');
                                    const label = formatSegment(segment);
                                    return (
                                        <Fragment key={href}>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                {isLast ? (
                                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                        </Fragment>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    )}
                </div>
            </div>

            {/* Utility cluster (was TopUtilityBar) — auth-dependent, must not hydrate-mismatch */}
            {!isAuthRoute && (
                <div className="flex items-center gap-2 shrink-0" suppressHydrationWarning>
                    <ThemeSwitcher />

                    {isCandidatePortfolioRoute ? (
                        <div className="flex items-center gap-2">
                            {resolvedUser ? (
                                <Link
                                    href="/jobs?tab=for-you"
                                    className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-95 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Create Profile
                                </Link>
                            )}
                        </div>
                    ) : !resolvedUser ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="px-3 py-1.5 text-xs font-semibold text-foreground hover:text-primary transition-all duration-150 ease-out active:scale-95 shrink-0"
                            >
                                Log in
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {pendingSyncCount > 0 && (
                                <span className="inline-flex items-center rounded-full border border-signal-aging/30 bg-signal-aging/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-signal-aging">
                                    {pendingSyncCount} pending
                                </span>
                            )}

                            {/* Sidebar pages keep the notification bell — no avatar here. */}
                            <AlertsDropdown />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function SiteHeader() {
    return (
        <Suspense fallback={<div className="hidden h-14 w-full shrink-0 lg:block" aria-hidden />}>
            <SiteHeaderContent />
        </Suspense>
    );
}
