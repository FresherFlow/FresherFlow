'use client';

import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ACCOUNT_LABELS: Record<string, string> = {
    '/dashboard':     'Dashboard',
    '/tracker':       'Application Tracker',
    '/saved':         'Saved Jobs',
    '/profile':       'My Profile',
    '/settings':      'Settings',
    '/alerts':        'Job Alerts',
    '/notifications': 'Notifications',
    '/account':       'Account',
};

function TopHeaderBarContent() {
    const pathname   = usePathname() || '';
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const normalized = pathname.toLowerCase();
    const accountKey = Object.keys(ACCOUNT_LABELS).find(k => normalized.startsWith(k));

    if (!isMounted || !accountKey) return null;

    return (
        <div className="hidden md:flex fixed top-0 left-48 right-0 h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm z-[80] pr-36 px-5">
            <h1 className="text-sm font-bold text-foreground tracking-tight">
                {ACCOUNT_LABELS[accountKey]}
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
