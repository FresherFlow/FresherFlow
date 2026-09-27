'use client';

import * as React from 'react';

export type AppSidebarVariant = 'sidebar' | 'floating' | 'inset';
export type AppCollapsible = 'offcanvas' | 'icon' | 'none';

const VARIANTS: readonly AppSidebarVariant[] = ['sidebar', 'floating', 'inset'];
const COLLAPSIBLES: readonly AppCollapsible[] = ['offcanvas', 'icon', 'none'];

const VARIANT_COOKIE = 'ff_layout_variant';
const COLLAPSIBLE_COOKIE = 'ff_layout_collapsible';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Defaults match today's user rail exactly
// (`<Sidebar collapsible="icon">` with the default `sidebar` variant), so
// existing users see zero visual change on deploy.
const DEFAULT_VARIANT: AppSidebarVariant = 'sidebar';
const DEFAULT_COLLAPSIBLE: AppCollapsible = 'icon';

// Pre-context storage written by the Account → Appearance picker before this
// provider existed. Read once as a fallback so choices already made carry
// over; every write below keeps it in sync for legacy readers.
const LEGACY_VARIANT_KEY = 'ff:sidebarVariant';

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
    try {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}`;
    } catch {
        // Storage unavailable (private mode, blocked cookies) — state still applies this session.
    }
}

function readVariant(): AppSidebarVariant {
    const saved = readCookie(VARIANT_COOKIE);
    if (saved && (VARIANTS as readonly string[]).includes(saved)) {
        return saved as AppSidebarVariant;
    }
    // One-time migration from the pre-context picker storage.
    if (typeof localStorage !== 'undefined') {
        try {
            const legacy = localStorage.getItem(LEGACY_VARIANT_KEY);
            if (legacy && (VARIANTS as readonly string[]).includes(legacy)) {
                writeCookie(VARIANT_COOKIE, legacy);
                return legacy as AppSidebarVariant;
            }
        } catch {
            // Storage unavailable — default variant applies.
        }
    }
    return DEFAULT_VARIANT;
}

function readCollapsible(): AppCollapsible {
    const saved = readCookie(COLLAPSIBLE_COOKIE);
    return saved && (COLLAPSIBLES as readonly string[]).includes(saved)
        ? (saved as AppCollapsible)
        : DEFAULT_COLLAPSIBLE;
}

function writeVariant(next: AppSidebarVariant) {
    writeCookie(VARIANT_COOKIE, next);
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LEGACY_VARIANT_KEY, next);
        }
    } catch {
        // Legacy fallback only — safe to skip.
    }
}

type AppLayoutContextValue = {
    variant: AppSidebarVariant;
    setVariant: (variant: AppSidebarVariant) => void;
    collapsible: AppCollapsible;
    setCollapsible: (collapsible: AppCollapsible) => void;
    resetLayout: () => void;
};

const AppLayoutContext = React.createContext<AppLayoutContextValue | null>(null);

/**
 * App-shell-only layout preferences (sidebar variant + collapse mode).
 * Never consumed by the admin shell: that tree lives under
 * `AdminLayoutProvider` with its own `admin_layout_*` cookies, so admin and
 * user choices never clash.
 */
export function AppLayoutProvider({ children }: { children: React.ReactNode }) {
    const [variant, setVariantState] = React.useState<AppSidebarVariant>(readVariant);
    const [collapsible, setCollapsibleState] = React.useState<AppCollapsible>(readCollapsible);

    const setVariant = React.useCallback((next: AppSidebarVariant) => {
        setVariantState(next);
        writeVariant(next);
    }, []);

    const setCollapsible = React.useCallback((next: AppCollapsible) => {
        setCollapsibleState(next);
        writeCookie(COLLAPSIBLE_COOKIE, next);
    }, []);

    const resetLayout = React.useCallback(() => {
        setVariantState(DEFAULT_VARIANT);
        writeVariant(DEFAULT_VARIANT);
        setCollapsibleState(DEFAULT_COLLAPSIBLE);
        writeCookie(COLLAPSIBLE_COOKIE, DEFAULT_COLLAPSIBLE);
    }, []);

    const value = React.useMemo<AppLayoutContextValue>(
        () => ({ variant, setVariant, collapsible, setCollapsible, resetLayout }),
        [variant, setVariant, collapsible, setCollapsible, resetLayout],
    );

    return <AppLayoutContext.Provider value={value}>{children}</AppLayoutContext.Provider>;
}

export function useAppLayout(): AppLayoutContextValue {
    const context = React.useContext(AppLayoutContext);
    if (!context) {
        throw new Error('useAppLayout must be used within an AppLayoutProvider.');
    }
    return context;
}
