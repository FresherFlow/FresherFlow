'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb } from '@/ui/Breadcrumb';


const LABEL_OVERRIDES: Record<string, string> = {
    'govt': 'Government Jobs',
    'walk-ins': 'Walk-ins',
};

function formatSegment(segment: string): string {
    const lowerSegment = segment.toLowerCase();
    if (LABEL_OVERRIDES[lowerSegment]) {
        return LABEL_OVERRIDES[lowerSegment];
    }
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function TopHeaderBarContent() {
    const pathname = usePathname() || '';

    if (pathname === '/') return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const isAdminRoute = pathname.startsWith('/admin');
    let adminTitle = '';
    if (isAdminRoute) {
        const adminPage = segments[1] || 'overview';
        if (adminPage === 'dashboard' || adminPage === 'overview') adminTitle = 'Admin Overview';
        else if (adminPage === 'opportunities') adminTitle = 'Listings';
        else if (adminPage === 'resources') adminTitle = 'Resources';
        else if (adminPage === 'push') adminTitle = 'Push Notifications';
        else if (adminPage === 'captions') adminTitle = 'Captions';
        else if (adminPage === 'feedback') adminTitle = 'Feedback';
        else if (adminPage === 'settings') adminTitle = 'Settings';
        else if (adminPage === 'discovery') adminTitle = 'Discovery Engine';
        else adminTitle = formatSegment(adminPage);
    }

    const isFeedRoute = !isAdminRoute && (
        (segments[0] === 'jobs' && (segments.length === 1 || ['internships', 'walk-ins', 'remote'].includes(segments[1]))) ||
        (['govt', 'hackathons', 'resources'].includes(segments[0]) && segments.length === 1)
    );
    return (
        <div 
            className="hidden md:flex fixed top-0 right-0 h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-[80] pr-6 px-5 transition-[left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]"
            style={{ left: 'var(--sidebar-w, 12rem)' }}
        >
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
                    <Breadcrumb items={[
                        { label: 'Home', href: '/' },
                        ...segments.map((segment, index) => ({
                            label: formatSegment(segment),
                            href: '/' + segments.slice(0, index + 1).join('/')
                        }))
                    ]} />
                )}
            </div>
        </div>
    );
}

export function TopHeaderBar() {
    return (
        <Suspense fallback={<div className="hidden md:block fixed top-0 right-0 h-14 z-[80] transition-[left] duration-[600ms] ease-[cubic-bezier(0.7,0,0,1)]" style={{ left: 'var(--sidebar-w, 12rem)' }} />}>
            <TopHeaderBarContent />
        </Suspense>
    );
}
