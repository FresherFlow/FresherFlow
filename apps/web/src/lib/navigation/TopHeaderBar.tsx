'use client';

import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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

    const breadcrumbs = segments.map(formatSegment).join(' > ');

    return (
        <div className="hidden md:flex fixed top-0 left-48 right-0 h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-[80] pr-36 px-5">
            <h1 className="text-sm font-bold text-foreground tracking-tight">
                {breadcrumbs}
            </h1>
        </div>
    );
}

export function TopHeaderBar() {
    return (
        <Suspense fallback={<div className="hidden md:block fixed top-0 left-48 right-0 h-14 z-[80]" />}>
            <TopHeaderBarContent />
        </Suspense>
    );
}
