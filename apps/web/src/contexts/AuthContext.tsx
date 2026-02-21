'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi } from '@/lib/api/client';
import { clearUnreadCache } from '@/hooks/useUnreadNotifications';
import { User, Profile } from '@fresherflow/types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, code: string, source?: string) => Promise<void>;
    loginWithGoogle: (token: string, source?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Offline session cache ────────────────────────────────────────────────────
const SESSION_CACHE_KEY = 'ff_cached_session_v1';

type CachedSession = {
    user: User;
    profile: Profile | null;
    savedAt: number;
};

function readCachedSession(): CachedSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CachedSession;
    } catch {
        return null;
    }
}

function writeCachedSession(user: User, profile: Profile | null) {
    if (typeof window === 'undefined') return;
    try {
        const payload: CachedSession = { user, profile, savedAt: Date.now() };
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore quota errors
    }
}

function clearCachedSession() {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(SESSION_CACHE_KEY); } catch { /* empty */ }
}
// ────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const logout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        if (typeof window !== 'undefined') {
            (window as Window & { __isLoggingOut?: boolean }).__isLoggingOut = true;
        }

        try {
            const win = window as Window & { google?: { accounts: { id: { disableAutoSelect: () => void } } } };
            if (typeof window !== 'undefined' && win.google?.accounts?.id) {
                win.google.accounts.id.disableAutoSelect();
            }

            setUser(null);
            setProfile(null);
            clearCachedSession();
            clearUnreadCache();
            await authApi.logout();
        } catch {
            // Ignore logout errors
        } finally {
            if (typeof document !== 'undefined') {
                const cookiesToClear = ['accessToken', 'refreshToken', 'ff_logged_in'];
                cookiesToClear.forEach(name => {
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname};`;
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;`;
                });
            }
            window.location.replace('/login');
        }
    }, [isLoggingOut]);

    const loadUser = useCallback(async () => {
        setIsLoading(true);
        try {
            // DEFENSIVE: Check if session marker cookie exists
            if (typeof document !== 'undefined') {
                const hasSession = document.cookie.includes('ff_logged_in=true');
                if (!hasSession) {
                    // No session cookie — check if we're offline with a cached session
                    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
                    if (isOffline) {
                        const cached = readCachedSession();
                        if (cached) {
                            setUser(cached.user);
                            setProfile(cached.profile);
                            setIsLoading(false);
                            return;
                        }
                    }
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }
            }

            // Attempt to fetch current user
            const response = await authApi.me() as { user: User; profile: Profile };
            setUser(response.user);
            setProfile(response.profile);
            // Persist for offline cold-launch
            writeCachedSession(response.user, response.profile);
        } catch {
            // Network failed — try cached session before clearing
            const cached = readCachedSession();
            if (cached) {
                setUser(cached.user);
                setProfile(cached.profile);
            } else {
                setUser(null);
                setProfile(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load user on mount + refresh when tab regains focus
    useEffect(() => {
        loadUser();

        // Re-fetch when user comes back to the tab (e.g. after editing profile)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadUser();
            }
        };

        // Global handler for unauthorized errors (session expiry)
        const handleUnauthorized = () => {
            console.warn('[Auth] Session expired event received. Logging out.');
            logout();
        };

        if (typeof window !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('fresherflow-unauthorized', handleUnauthorized);
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('fresherflow-unauthorized', handleUnauthorized);
            };
        }
    }, [loadUser, logout]);

    async function login(email: string, password: string) {
        await authApi.login(email, password);
        const meResponse = await authApi.me() as { user: User; profile: Profile };
        setUser(meResponse.user);
        setProfile(meResponse.profile);
        writeCachedSession(meResponse.user, meResponse.profile);
    }

    async function sendOtp(email: string) {
        await authApi.sendOtp(email);
    }

    async function verifyOtp(email: string, code: string, source?: string) {
        const response = await authApi.verifyOtp(email, code, source);
        setUser(response.user);
        setProfile(response.profile as Profile);
        writeCachedSession(response.user, response.profile as Profile);
    }

    async function loginWithGoogle(token: string, source?: string) {
        const response = await authApi.googleLogin(token, source);
        setUser(response.user);
        setProfile(response.profile as Profile);
        writeCachedSession(response.user, response.profile as Profile);
    }

    async function refreshUser() {
        await loadUser();
    }

    async function refreshProfile() {
        await loadUser();
    }

    return (
        <AuthContext.Provider
            value={{ user, profile, isLoading, login, sendOtp, verifyOtp, loginWithGoogle, logout, refreshUser, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
