'use client';

import { Suspense, Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';
import { AdminProfileMenu } from '@/features/admin/layout/AdminProfileMenu';
import { AdminSearchTrigger } from '@/features/admin/layout/AdminSearchTrigger';
import { SidebarTrigger } from '@/ui/sidebar';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { formatSegment, getAdminTitle, isFeedHeaderRoute } from './headerContent';

/**
 * Admin desktop header. Sticky inside the content column (shadcn-admin
 * `Header` pattern: `sticky top-0 w-[inherit]`) — it spans whatever the
 * content area is in every variant with zero offset math, so Sidebar /
 * Inset / Floating can never misalign it. Pages clear the mobile fixed
 * header with top padding; on lg+ the header is in-flow.
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
            className="hidden h-14 w-full shrink-0 sticky top-0 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-40 pr-4 px-4 sm:pr-6 sm:px-5 lg:flex"
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
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <SidebarTrigger muted />
                        <div aria-hidden className="h-6 w-px shrink-0 bg-border" />
                        <div className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">{adminTitle}</div>
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
                            <div className="hidden sm:block">
                                <AdminSearchTrigger />
                            </div>
                            <div aria-hidden className="hidden h-6 w-px shrink-0 bg-border sm:block" />
                            <ThemeSwitcher />
                            <AdminProfileMenu />
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
        <Suspense fallback={<div className="h-14 w-full shrink-0" aria-hidden />}>
            <TopHeaderBarContent />
        </Suspense>
    );
}
