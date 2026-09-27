'use client';

import * as React from 'react';

export type AdminSidebarVariant = 'sidebar' | 'floating' | 'inset';
export type AdminCollapsible = 'offcanvas' | 'icon' | 'none';

const VARIANTS: readonly AdminSidebarVariant[] = ['sidebar', 'floating', 'inset'];
const COLLAPSIBLES: readonly AdminCollapsible[] = ['offcanvas', 'icon', 'none'];

const VARIANT_COOKIE = 'admin_layout_variant';
const COLLAPSIBLE_COOKIE = 'admin_layout_collapsible';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Defaults match the hardcoded rail shipped before this provider existed
// (`<Sidebar collapsible="icon">` with the default `sidebar` variant), so
// existing operators see no visual change on deploy.
const DEFAULT_VARIANT: AdminSidebarVariant = 'sidebar';
const DEFAULT_COLLAPSIBLE: AdminCollapsible = 'icon';

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

function readVariant(): AdminSidebarVariant {
    const saved = readCookie(VARIANT_COOKIE);
    return saved && (VARIANTS as readonly string[]).includes(saved)
        ? (saved as AdminSidebarVariant)
        : DEFAULT_VARIANT;
}

function readCollapsible(): AdminCollapsible {
    const saved = readCookie(COLLAPSIBLE_COOKIE);
    return saved && (COLLAPSIBLES as readonly string[]).includes(saved)
        ? (saved as AdminCollapsible)
        : DEFAULT_COLLAPSIBLE;
}

type AdminLayoutContextValue = {
    variant: AdminSidebarVariant;
    setVariant: (variant: AdminSidebarVariant) => void;
    collapsible: AdminCollapsible;
    setCollapsible: (collapsible: AdminCollapsible) => void;
    resetLayout: () => void;
};

const AdminLayoutContext = React.createContext<AdminLayoutContextValue | null>(null);

/**
 * Admin-shell-only layout preferences (sidebar variant + collapse mode).
 * Never consumed by the app (non-admin) shell: that tree is outside this
 * provider, so its rail and header keep reading the shared `sidebarState`
 * store untouched.
 */
export function AdminLayoutProvider({ children }: { children: React.ReactNode }) {
    const [variant, setVariantState] = React.useState<AdminSidebarVariant>(readVariant);
    const [collapsible, setCollapsibleState] = React.useState<AdminCollapsible>(readCollapsible);

    const setVariant = React.useCallback((next: AdminSidebarVariant) => {
        setVariantState(next);
        writeCookie(VARIANT_COOKIE, next);
    }, []);

    const setCollapsible = React.useCallback((next: AdminCollapsible) => {
        setCollapsibleState(next);
        writeCookie(COLLAPSIBLE_COOKIE, next);
    }, []);

    const resetLayout = React.useCallback(() => {
        setVariantState(DEFAULT_VARIANT);
        writeCookie(VARIANT_COOKIE, DEFAULT_VARIANT);
        setCollapsibleState(DEFAULT_COLLAPSIBLE);
        writeCookie(COLLAPSIBLE_COOKIE, DEFAULT_COLLAPSIBLE);
    }, []);

    const value = React.useMemo<AdminLayoutContextValue>(
        () => ({ variant, setVariant, collapsible, setCollapsible, resetLayout }),
        [variant, setVariant, collapsible, setCollapsible, resetLayout],
    );

    return <AdminLayoutContext.Provider value={value}>{children}</AdminLayoutContext.Provider>;
}

export function useAdminLayout(): AdminLayoutContextValue {
    const context = React.useContext(AdminLayoutContext);
    if (!context) {
        throw new Error('useAdminLayout must be used within an AdminLayoutProvider.');
    }
    return context;
}
