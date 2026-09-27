'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { adminAuthApi, clearAdminAccessToken, getAdminAccessToken } from '@/lib/api/client';
import { adminApi } from '@/lib/api/admin';
import { AuthContext } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

import { Admin } from '@fresherflow/types';

export interface ModeratorSession {
    userId: string;
    email: string | null;
    name: string | null;
    permissions: string[];
}

interface AdminContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    admin: Admin | null;
    /** Present when signed in via a user account holding access-role grants. */
    moderator: ModeratorSession | null;
    isModerator: boolean;
    /** Admin sessions pass everything; moderator sessions check their keys. */
    hasPermission: (key: string) => boolean;
    /** Admins get a full logout; moderators just exit to the user app. */
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);
const ADMIN_SESSION_CACHE_KEY = 'ff_cached_admin_session_v1';
const MODERATOR_SESSION_CACHE_KEY = 'ff_cached_moderator_session_v1';
const ADMIN_SESSION_REVALIDATE_MS = Number(process.env.NEXT_PUBLIC_ADMIN_SESSION_REVALIDATE_MS || 30 * 60 * 1000);
const ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS || 300000);

type CachedAdminSession = {
    admin: Admin;
    savedAt: number;
};

function readCachedAdminSession(): CachedAdminSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ADMIN_SESSION_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CachedAdminSession;
    } catch {
        return null;
    }
}

function writeCachedAdminSession(admin: Admin) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(ADMIN_SESSION_CACHE_KEY, JSON.stringify({ admin, savedAt: Date.now() }));
    } catch {
        // ignore quota errors
    }
}

function clearCachedAdminSession() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(ADMIN_SESSION_CACHE_KEY);
    } catch {
        // ignore quota errors
    }
}

type CachedModeratorSession = {
    session: ModeratorSession;
    savedAt: number;
};

function readCachedModeratorSession(): CachedModeratorSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(MODERATOR_SESSION_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CachedModeratorSession;
    } catch {
        return null;
    }
}

function writeCachedModeratorSession(session: ModeratorSession) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            MODERATOR_SESSION_CACHE_KEY,
            JSON.stringify({ session, savedAt: Date.now() }),
        );
    } catch {
        // ignore quota errors
    }
}

function clearCachedModeratorSession() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(MODERATOR_SESSION_CACHE_KEY);
    } catch {
        // ignore quota errors
    }
}

function isCachedAdminSessionFresh(cached: { savedAt: number } | null) {
    return Boolean(cached && Date.now() - cached.savedAt < ADMIN_SESSION_REVALIDATE_MS);
}

function hasAdminSessionCookie() {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes('ff_admin_logged_in=true') || Boolean(getAdminAccessToken());
}

export function AdminProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [moderator, setModerator] = useState<ModeratorSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    // AuthContext may be absent in exotic mounts — useContext (not useAuth)
    // so a missing provider yields undefined instead of throwing.
    // NOTE: only `authUserId` (primitive) is ever a hook dep. The context
    // object identity changes on every AuthProvider render — depending on it
    // re-ran the whole session check (with full-screen loader flashes).
    const authCtx = useContext(AuthContext);
    const authUser = authCtx?.user ?? null;
    const authUserId = authUser?.id ?? null;
    const lastVisibilityRefreshAtRef = useRef(0);
    const lastSuccessfulLoadAtRef = useRef(0);

    const checkModeratorSession = useCallback(
        async (
            user: { id: string; email?: string | null; username?: string | null; fullName?: string | null } | null,
            options?: { silent?: boolean },
        ) => {
            const silent = options?.silent === true;
            if (!user) {
                setModerator(null);
                clearCachedModeratorSession();
                return;
            }
            try {
                const cached = readCachedModeratorSession();
                if (cached && cached.session.userId === user.id && isCachedAdminSessionFresh(cached)) {
                    setModerator(cached.session);
                    return;
                }
                // Staff identity endpoint (works on user sessions): carries
                // an explicit moderator flag, so bare-grant moderators (grant
                // row, zero permission rows yet) are still recognized — the
                // keys-only endpoint cannot tell them apart from plain users.
                const res = await adminApi.getModeratorMe();
                if (!res?.isModerator) {
                    setModerator(null);
                    clearCachedModeratorSession();
                    return;
                }
                const session: ModeratorSession = {
                    userId: res.userId || user.id,
                    email: user.email ?? null,
                    name: user.fullName ?? user.username ?? null,
                    permissions: Array.isArray(res.permissions) ? res.permissions : [],
                };
                setModerator(session);
                writeCachedModeratorSession(session);
            } catch {
                // Offline or 401: fall back to a cached session for the same
                // user so a transient failure doesn't blank the queues.
                const cached = readCachedModeratorSession();
                if (cached && cached.session.userId === user.id) {
                    setModerator(cached.session);
                } else {
                    setModerator(null);
                }
            } finally {
                if (!silent) setIsLoading(false);
            }
        },
        [],
    );

    /**
     * Admin half of the check. Returns true when an admin session is valid.
     * Never touches `isLoading` — the wrapping `checkSessions` owns it.
     */
    const checkAdminSessionInner = useCallback(async (): Promise<boolean> => {
        try {
            const cached = readCachedAdminSession();
            if (!hasAdminSessionCookie()) {
                setAdmin(null);
                clearCachedAdminSession();
                return false;
            }

            if (cached && isCachedAdminSessionFresh(cached)) {
                setAdmin(cached.admin);
                lastSuccessfulLoadAtRef.current = cached.savedAt;
                return true;
            }

            const response = await adminAuthApi.me();
            if (response.admin) {
                setAdmin(response.admin);
                writeCachedAdminSession(response.admin);
                lastSuccessfulLoadAtRef.current = Date.now();
                return true;
            }
            setAdmin(null);
            clearCachedAdminSession();
            return false;
        } catch {
            const cached = readCachedAdminSession();
            if (cached) {
                setAdmin(cached.admin);
                lastSuccessfulLoadAtRef.current = cached.savedAt;
                return true;
            }
            setAdmin(null);
            return false;
        }
    }, []);

    const checkSessions = useCallback(
        async (
            user: { id: string; email?: string | null; username?: string | null; fullName?: string | null } | null,
            options?: { silent?: boolean },
        ) => {
            const silent = options?.silent === true;
            if (!silent) setIsLoading(true);
            try {
                const isAdmin = await checkAdminSessionInner();
                if (isAdmin) {
                    setModerator(null);
                    clearCachedModeratorSession();
                } else {
                    await checkModeratorSession(user, options);
                }
            } finally {
                if (!silent) setIsLoading(false);
            }
        },
        [checkAdminSessionInner, checkModeratorSession],
    );

    useEffect(() => {
        void checkSessions(authUser);

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastVisibilityRefreshAtRef.current < ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS) return;
            if (now - lastSuccessfulLoadAtRef.current < ADMIN_SESSION_REVALIDATE_MS) return;
            lastVisibilityRefreshAtRef.current = now;
            void checkSessions(authUser, { silent: true });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // Stable by construction: callbacks take the user as an argument, so
        // only the primitive id re-triggers (login/logout switches).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkSessions, router, authUserId]);

    const hasPermission = useCallback(
        (key: string): boolean => {
            if (admin) return true;
            if (moderator) return moderator.permissions.includes(key);
            return false;
        },
        [admin, moderator],
    );

    async function logout() {
        // Moderators never had an admin session: just leave the queues and
        // stay signed into the user app.
        if (!admin && moderator) {
            clearCachedModeratorSession();
            setModerator(null);
            router.push('/jobs?tab=for-you');
            return;
        }
        try {
            if (typeof window !== 'undefined') {
                (window as Window & { __isAdminLoggingOut?: boolean }).__isAdminLoggingOut = true;
            }
            clearCachedAdminSession();
            clearAdminAccessToken();
            await adminAuthApi.logout();
        } catch {
            // Ignore logout errors
        }
        if (typeof document !== 'undefined') {
            document.cookie = 'ff_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = `ff_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname};`;
        }
        clearAdminAccessToken();
        setAdmin(null);
        router.push('/admin/login');
    }

    async function refresh() {
        await checkSessions(authUser);
    }

    return (
        <AdminContext.Provider
            value={{
                isAuthenticated: !!admin || !!moderator,
                isLoading,
                admin,
                moderator,
                isModerator: !!moderator && !admin,
                hasPermission,
                logout,
                refresh,
            }}
        >
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
