'use client';

import { Suspense, Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';
import { AdminSearchTrigger } from '@/features/admin/layout/AdminSearchTrigger';
import { SidebarTrigger } from '@/ui/sidebar';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { formatSegment, getAdminTitle, isFeedHeaderRoute } from './headerContent';
import { SIDEBAR_W_VAR } from './sidebarState';

/**
 * Admin desktop header. Single desktop header for admin routes — sidebar
 * routes use SiteHeader, public routes use DesktopNav, mobile uses
 * MobileTopNav. Same offset contract: fixed, `left: var(--sidebar-w)`,
 * flat (no new boxes). Shadcn-style single row: trigger + title + ml-auto
 * right cluster. Admin pages render their own in-flow bars below this.
 */
function TopHeaderBarContent() {
    const pathname = usePathname() || '';

    if (pathname === '/') return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const isAdminRoute = pathname.startsWith('/admin');
    const adminTitle = isAdminRoute ? getAdminTitle(segments) : '';

    const isFeedRoute = !isAdminRoute && isFeedHeaderRoute(segments);
    return (
        <div 
            className="hidden lg:flex fixed top-0 right-0 h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-40 pr-6 px-5 transition-[left] duration-200 ease-linear motion-reduce:transition-none"
            style={{ left: SIDEBAR_W_VAR }}
        >
            {/* Single row: feed breadcrumb / admin row / generic breadcrumb. */}
            <div className="flex items-center gap-6 w-full">
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
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <SidebarTrigger className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground" />
                        <div className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">{adminTitle}</div>
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                            <AdminSearchTrigger />
                            <ThemeSwitcher />
                        </div>
                    </div>
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
    );
}

export function TopHeaderBar() {
    return (
        <Suspense fallback={<div className="hidden lg:block fixed top-0 right-0 h-14 z-40 transition-[left] duration-200 ease-linear motion-reduce:transition-none" style={{ left: SIDEBAR_W_VAR }} />}>
            <TopHeaderBarContent />
        </Suspense>
    );
}
