'use client';

import * as React from 'react';

/**
 * Single home for sidebar collapse persistence.
 *
 * Two SidebarProviders exist (the app shell in `NavigationWrapper` and the
 * shadcn demo in `dev/dashboard`), and both must read/write the SAME store —
 * otherwise toggling one poisons the other on reload, since the stock
 * `SidebarProvider` always writes the same `sidebar_state` cookie.
 *
 * Priority: `sidebar_state` cookie first, legacy `ff:sidebarCollapsed`
 * localStorage second, expanded by default.
 */

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const LEGACY_STORAGE_KEY = 'ff:sidebarCollapsed';

export function readSidebarOpen(): boolean {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
        if (match) return match[1] === 'true';
    }
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LEGACY_STORAGE_KEY) !== 'true';
    }
    return true;
}

/** The single width token the shell and the fixed header both consume. */
const SIDEBAR_W = { expanded: '12rem', collapsed: '3rem' } as const;

export function persistSidebarOpen(next: boolean) {
    // Cookie first: it is the source of truth read on reload. Each store is
    // guarded so a blocked localStorage can never skip the cookie write
    // (which would make the sidebar pop back open on every reload).
    try {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    } catch {
        // Storage unavailable (private mode, blocked cookies) — state still applies this session.
    }
    try {
        localStorage.setItem(LEGACY_STORAGE_KEY, String(!next));
    } catch {
        // Legacy fallback only — safe to skip.
    }
    try {
        document.documentElement.setAttribute('data-sidebar', next ? 'expanded' : 'collapsed');
        // No CSS rule owns `--sidebar-w`, so it must be set here. The shell
        // (`lg:pl-[var(--sidebar-w)]`) and the fixed header (`left:
        // var(--sidebar-w)`) both read it — without this write they stay at
        // the load-time value while the rail animates away underneath them.
        document.documentElement.style.setProperty('--sidebar-w', next ? SIDEBAR_W.expanded : SIDEBAR_W.collapsed);
    } catch {
        // Not in a DOM context — nothing to mirror.
    }
}

/** Controlled `open` state for a `SidebarProvider`, persisted across reloads. */
export function useSidebarOpenState() {
    const [open, setOpen] = React.useState<boolean>(() => {
        // Prefer the pre-hydration value written by HeadInjections so the first
        // client render matches the `--sidebar-w` already applied to the DOM.
        // Otherwise the rail mounts expanded while the header offset is still
        // collapsed (or vice versa) and the two overlap on load.
        if (typeof document !== 'undefined') {
            const prehydrated = document.documentElement.getAttribute('data-sidebar');
            if (prehydrated === 'collapsed') return false;
            if (prehydrated === 'expanded') return true;
        }
        return readSidebarOpen();
    });

    const handleOpenChange = React.useCallback((next: boolean) => {
        setOpen(next);
        persistSidebarOpen(next);
    }, []);

    React.useEffect(() => {
        try {
            document.documentElement.setAttribute('data-sidebar', open ? 'expanded' : 'collapsed');
            document.documentElement.style.setProperty('--sidebar-w', open ? SIDEBAR_W.expanded : SIDEBAR_W.collapsed);
        } catch {
            // Not in a DOM context — nothing to mirror.
        }
    }, [open]);

    return [open, handleOpenChange] as const;
}
