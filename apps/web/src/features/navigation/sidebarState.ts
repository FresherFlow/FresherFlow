'use client';

import * as React from 'react';

/**
 * Single home for sidebar collapse persistence.
 *
 * Three `SidebarProvider`s exist — the app shell (`NavigationWrapper`), the
 * admin shell (`AdminLayoutClient`), and the standalone shadcn demo under
 * `dev/sidebar` — and every tree reads/writes the SAME store, otherwise
 * toggling one poisons the others on reload, since the stock
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
export const SIDEBAR_W = { expanded: '12rem', collapsed: '3rem' } as const;

/**
 * Single `var(--sidebar-w, …)` expression for every inline reader — the fixed
 * header offset (`left`), the rail binding (`--sidebar-width`), and their
 * Suspense fallbacks. Reading it from here keeps the header and the rail from
 * ever falling back to two different widths.
 */
export const SIDEBAR_W_VAR = `var(--sidebar-w, ${SIDEBAR_W.expanded})`;

/** Resizable range: our small 12rem ↔ shadcn regular ~15rem (192px ↔ 240px) — decreased from 256px per feedback. */
export const SIDEBAR_WIDTH_MIN = 192;
export const SIDEBAR_WIDTH_MAX = 240;
const SIDEBAR_WIDTH_STORAGE_KEY = 'ff:sidebarWidth';

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

export function readSidebarWidth(): number | null {
    try {
        const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
        if (!raw) return null;
        const v = Number(raw);
        if (!Number.isFinite(v)) return null;
        return clamp(v, SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX);
    } catch {
        return null;
    }
}

export function persistSidebarWidth(px: number) {
    const clamped = clamp(px, SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX);
    try {
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
    } catch {}
    try {
        // Only apply when expanded — collapsed stays 3rem.
        const isCollapsed = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
        if (!isCollapsed) {
            document.documentElement.style.setProperty('--sidebar-w', `${clamped}px`);
        }
    } catch {}
}

export function getStoredSidebarWidthOrDefault(): string {
    const w = readSidebarWidth();
    return w ? `${w}px` : SIDEBAR_W.expanded;
}

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
        // No CSS rule owns `--sidebar-w`, so it must be set here. The rail
        // binding (`--sidebar-width: var(--sidebar-w)`) and the fixed header
        // (`left: var(--sidebar-w)`) both read it — without this write they
        // stay at the load-time value while the header lags the rail.
        if (next) {
            // Restore resizable width if user dragged before.
            const stored = readSidebarWidth();
            document.documentElement.style.setProperty(
                '--sidebar-w',
                stored ? `${stored}px` : SIDEBAR_W.expanded
            );
        } else {
            document.documentElement.style.setProperty('--sidebar-w', SIDEBAR_W.collapsed);
        }
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
            if (open) {
                const stored = readSidebarWidth();
                document.documentElement.style.setProperty(
                    '--sidebar-w',
                    stored ? `${stored}px` : SIDEBAR_W.expanded
                );
            } else {
                document.documentElement.style.setProperty('--sidebar-w', SIDEBAR_W.collapsed);
            }
        } catch {
            // Not in a DOM context — nothing to mirror.
        }
    }, [open]);

    return [open, handleOpenChange] as const;
}

/* ────────────────────────────────────────────────────────────────────────────
   Remembered space (Jobs / Govt).
   Same idea as open-seo's remembered project id: route groups (`(public)`
   vs `(user)`) remount the sidebar on cross-group navigation, which re-runs
   `useState(getInitialSpace(...))` — and every space-neutral route like
   `/account` initializes to Jobs, wiping a Govt context. Persisting the last
   space-owned route (or explicit switch) lets a remount restore it.
   ──────────────────────────────────────────────────────────────────────────── */

const SPACE_STORAGE_KEY = 'ff:spaceId';

export function readSpaceId(): 'jobs' | 'govt' | null {
    try {
        const v = localStorage.getItem(SPACE_STORAGE_KEY);
        return v === 'jobs' || v === 'govt' ? v : null;
    } catch {
        return null;
    }
}

export function persistSpaceId(id: string) {
    try {
        if (id === 'jobs' || id === 'govt') {
            localStorage.setItem(SPACE_STORAGE_KEY, id);
        }
    } catch {
        // Storage unavailable — space still applies this session.
    }
}

let repeatGuardInstalled = false;

/**
 * Holding Ctrl/Cmd+B fires key auto-repeat, which machine-guns the toggle
 * listener and blinks the rail between expanded and collapsed. That
 * listener lives inside the shadcn primitive, so the repeat check cannot
 * go there — instead this guard registers first (module evaluation always
 * precedes effects, so it sits ahead of the primitive's own listener) and
 * swallows repeat presses via stopImmediatePropagation. First presses
 * pass through untouched. Idempotent, client-only, app-lifetime.
 */
export function ensureSidebarRepeatGuard() {
    if (repeatGuardInstalled || typeof window === 'undefined') return;
    repeatGuardInstalled = true;
    window.addEventListener(
        'keydown',
        (event) => {
            if (event.repeat && (event.metaKey || event.ctrlKey) && event.key === 'b') {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        },
        true
    );
}
