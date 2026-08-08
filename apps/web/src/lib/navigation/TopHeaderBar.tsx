'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb } from '@/ui/Breadcrumb';

const LABEL_OVERRIDES: Record<string, string> = {
    'government-jobs': 'Government Jobs',
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

    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        ...segments.map((segment, index) => ({
            label: formatSegment(segment),
            href: '/' + segments.slice(0, index + 1).join('/')
        }))
    ];
    
    const isFeedRoute = ['jobs', 'internships', 'walk-ins', 'remote', 'government-jobs', 'hackathons'].includes(segments[0]) && segments.length === 1;
    return (
        <div 
            className="hidden md:flex fixed top-0 right-0 h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-[80] pr-6 px-5"
            style={{ left: 'var(--sidebar-w, 12rem)' }}
        >
            {/* The portal target. Hidden when empty. Serves as a peer. */}
            <div id="top-header-portal-target" className="peer empty:hidden flex items-center gap-6 w-full" />
            
            {/* Fallback for pages that do not inject into this portal */}
            <div className="hidden peer-empty:flex items-center gap-6 w-full" id="top-header-fallback">
                {isFeedRoute ? (
                    <>
                        <div className="flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Home
                            <svg className="w-4 h-4 mx-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-foreground">{formatSegment(segments[0])}</span>
                        </div>
                        <div className="relative group w-full max-w-xl mx-auto flex-1 lg:ml-6 hidden lg:block">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <div className="pl-9 h-9 rounded-xl bg-card border border-border shadow-sm w-full" />
                        </div>
                    </>
                ) : (
                    <Breadcrumb items={breadcrumbItems} />
                )}
            </div>
        </div>
    );
}

export function TopHeaderBar() {
    return (
        <Suspense fallback={<div className="hidden md:block fixed top-0 right-0 h-14 z-[80]" style={{ left: 'var(--sidebar-w, 12rem)' }} />}>
            <TopHeaderBarContent />
        </Suspense>
    );
}
