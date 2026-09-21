'use client';

import { Suspense, useContext, Fragment } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/lib/auth/AuthContext';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/hooks/useOfflineActionQueue';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { SidebarTrigger } from '@/ui/sidebar';
import { Separator } from '@/ui/Separator';
import { formatSegment, getAdminTitle, isFeedHeaderRoute } from './headerContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';

/**
 * Merged site header for sidebar routes (Sidebar 07 `site-header` pattern):
 * SidebarTrigger + header portal target / breadcrumb fallback + the
 * TopUtilityBar cluster (theme, alerts, user menu). Positioning contract
 * is unchanged: fixed, `left: var(--sidebar-w)`, desktop only.
 */
function SiteHeaderContent() {
    const pathname = usePathname() || '';

    const context = useContext(AuthContext);
    const user = context?.user;
    const logout = context?.logout;
    const router = useRouter();
    const pendingSyncCount = useOfflineActionQueue(user?.id);

    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';
    const isCandidatePortfolioRoute = pathname?.startsWith('/u/');

    const handleLogout = () => { if (logout) void logout('/login'); };

    const initialLetter = user ? (user.fullName?.[0] || user.username?.[0] || 'U').toUpperCase() : 'U';

    if (pathname === '/') return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const isAdminRoute = pathname.startsWith('/admin');
    const adminTitle = isAdminRoute ? getAdminTitle(segments) : '';

    const isFeedRoute = !isAdminRoute && isFeedHeaderRoute(segments);

    return (
        <div
            className="hidden lg:flex fixed top-0 right-0 h-14 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur-sm z-50 pr-6 pl-4 transition-all duration-200 ease-linear"
            style={{ left: 'var(--sidebar-w, 12rem)' }}
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

            {/* Utility cluster (was TopUtilityBar) */}
            {!isAuthRoute && (
                <div className="flex items-center gap-2 shrink-0">
                    <ThemeSwitcher />

                    {isCandidatePortfolioRoute ? (
                        <div className="flex items-center gap-2">
                            {user ? (
                                <Link
                                    href="/dashboard"
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
                    ) : (
                        <>
                            {user ? (
                                <div className="flex items-center gap-2">
                                    {pendingSyncCount > 0 && (
                                        <span className="inline-flex items-center rounded-full border border-signal-aging/30 bg-signal-aging/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-signal-aging">
                                            {pendingSyncCount} pending
                                        </span>
                                    )}

                                    <AlertsDropdown />

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button aria-label="User Menu" suppressHydrationWarning className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border/60 text-xs font-bold uppercase transition-all duration-150 ease-out active:scale-95 hover:border-primary/40 cursor-pointer focus:outline-none">
                                                {initialLetter}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium leading-none truncate">{user?.fullName || user?.username || 'User'}</p>
                                                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || 'Loading...'}</p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer flex items-center">
                                                <Squares2X2Icon className="mr-2 h-4 w-4" />
                                                <span>Account Hub</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer flex items-center">
                                                <UserCircleIcon className="mr-2 h-4 w-4" />
                                                <span>Profile</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer flex items-center">
                                                <Cog6ToothIcon className="mr-2 h-4 w-4" />
                                                <span>Account Settings</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
                                                <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                                                <span>Log out</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/login"
                                        className="px-3 py-1.5 text-xs font-semibold text-foreground hover:text-primary transition-all duration-150 ease-out active:scale-95 shrink-0"
                                    >
                                        Log in
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function SiteHeader() {
    return (
        <Suspense fallback={<div className="hidden lg:block fixed top-0 right-0 h-14 z-40 transition-all duration-300 ease-out" style={{ left: 'var(--sidebar-w, 12rem)' }} />}>
            <SiteHeaderContent />
        </Suspense>
    );
}
