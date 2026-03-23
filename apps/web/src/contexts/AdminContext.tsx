'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { adminAuthApi, clearAdminAccessToken, getAdminAccessToken } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

import { Admin } from '@fresherflow/types';

interface AdminContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    admin: Admin | null;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);
const ADMIN_SESSION_CACHE_KEY = 'ff_cached_admin_session_v1';
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

function isCachedAdminSessionFresh(cached: CachedAdminSession | null) {
    return Boolean(cached && Date.now() - cached.savedAt < ADMIN_SESSION_REVALIDATE_MS);
}

function hasAdminSessionCookie() {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes('ff_admin_logged_in=true') || Boolean(getAdminAccessToken());
}

export function AdminProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const lastVisibilityRefreshAtRef = useRef(0);
    const lastSuccessfulLoadAtRef = useRef(0);

    const checkAdminSession = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true;
        if (!silent) setIsLoading(true);
        try {
            const cached = readCachedAdminSession();
            if (!hasAdminSessionCookie()) {
                setAdmin(null);
                clearCachedAdminSession();
                if (!silent) setIsLoading(false);
                return;
            }

            if (cached && isCachedAdminSessionFresh(cached)) {
                setAdmin(cached.admin);
                lastSuccessfulLoadAtRef.current = cached.savedAt;
                if (!silent) setIsLoading(false);
                return;
            }

            const response = await adminAuthApi.me();
            if (response.admin) {
                setAdmin(response.admin);
                writeCachedAdminSession(response.admin);
                lastSuccessfulLoadAtRef.current = Date.now();
            } else {
                setAdmin(null);
                clearCachedAdminSession();
            }
        } catch {
            const cached = readCachedAdminSession();
            if (cached) {
                setAdmin(cached.admin);
                lastSuccessfulLoadAtRef.current = cached.savedAt;
            } else {
                setAdmin(null);
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void checkAdminSession();

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastVisibilityRefreshAtRef.current < ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS) return;
            if (now - lastSuccessfulLoadAtRef.current < ADMIN_SESSION_REVALIDATE_MS) return;
            lastVisibilityRefreshAtRef.current = now;
            void checkAdminSession({ silent: true });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkAdminSession]);

    async function logout() {
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
        await checkAdminSession();
    }

    return (
        <AdminContext.Provider
            value={{
                isAuthenticated: !!admin,
                isLoading,
                admin,
                logout,
                refresh
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
