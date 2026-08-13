'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, UnauthorizedError, clearUserTokens, setUserTokens } from '@/lib/api/client';
import { clearUnreadCache } from '@/features/notifications/hooks/useUnreadNotifications';
import { User, Profile, Role } from '@fresherflow/types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    skipUsernameSetup: boolean;
    login: (email: string, password: string) => Promise<void>;
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, code: string, source?: string, ref?: string) => Promise<void>;
    loginWithGoogle: (source?: string, ref?: string) => Promise<void>;
    logout: (redirectTo?: string) => Promise<void>;
    refreshUser: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    forceRefreshProfile: () => Promise<void>;
    skipUsername: () => Promise<void>;
    updateProfileState: (updated: Partial<Profile> & { fullName?: string }, apiSyncTask?: () => Promise<unknown>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AUTH_VISIBILITY_REFRESH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_AUTH_VISIBILITY_REFRESH_COOLDOWN_MS || 300000);
const SESSION_REVALIDATE_MS = Number(process.env.NEXT_PUBLIC_SESSION_REVALIDATE_MS || 30 * 60 * 1000);
const SESSION_HINT_COOKIE_MAX_AGE_SECONDS = Number(process.env.NEXT_PUBLIC_SESSION_HINT_COOKIE_MAX_AGE_SECONDS || 90 * 24 * 60 * 60);

const SESSION_CACHE_KEY = 'ff_cached_session_v1';

type CachedSession = {
    user: User;
    profile: Profile | null;
    skipUsernameSetup?: boolean;
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

function writeCachedSession(user: User, profile: Profile | null, skipUsernameSetup?: boolean) {
    if (typeof window === 'undefined') return;
    try {
        const payload: CachedSession = { user, profile, skipUsernameSetup, savedAt: Date.now() };
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
    } catch { /* Ignore quota errors */ }
}

function clearCachedSession() {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(SESSION_CACHE_KEY); } catch { /* empty */ }
}

function clearAllClientCaches() {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key === 'ff_cached_session_v1' || 
                key.startsWith('ff_user_') ||
                key.startsWith('USER_')
            )) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        sessionStorage.clear();
    } catch {
        /* Ignore storage error */
    }
}

function clearClientSessionHints() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-logged-in', 'false');
    const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
    const cookiesToClear = ['ff_logged_in', 'accessToken', 'refreshToken'];
    cookiesToClear.forEach((name) => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        if (hostname) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${hostname};`;
        }
    });
}

function setClientSessionHints() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-logged-in', 'true');
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `ff_logged_in=true; path=/; max-age=${SESSION_HINT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function isCachedSessionFresh(cached: CachedSession | null) {
    return Boolean(cached && Date.now() - cached.savedAt < SESSION_REVALIDATE_MS);
}

async function writeFirebaseProfile(uid: string, profile: Profile) {
    try {
        const { ref, update } = await import('firebase/database');
        const { database } = await import('@/lib/api/firebase');
        const cleanProfile = JSON.parse(JSON.stringify({ ...profile, updatedAt: Date.now() }));
        const profileRef = ref(database, `/users/${uid}/careerProfile`);
        await update(profileRef, cleanProfile);
    } catch (err) {
        console.warn('[Firebase] Failed to write profile to RTDB:', err);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function readFirebaseProfile(uid: string): Promise<Profile | null> {
    try {
        const { ref, get } = await import('firebase/database');
        const { database } = await import('@/lib/api/firebase');
        const profileRef = ref(database, `/users/${uid}/careerProfile`);
        const snapshot = await get(profileRef);
        const val = snapshot.val();
        return val ? (val as Profile) : null;
    } catch (err) {
        console.warn('[Firebase] Failed to read profile from RTDB:', err);
        return null;
    }
}

async function readFirebaseOnboarding(uid: string): Promise<{ skipUsernameSetup?: boolean } | null> {
    try {
        const { ref, get } = await import('firebase/database');
        const { database } = await import('@/lib/api/firebase');
        const onboardingRef = ref(database, `/users/${uid}/onboarding`);
        const snapshot = await get(onboardingRef);
        const val = snapshot.val();
        return val ? val : null;
    } catch (err) {
        console.warn('[Firebase] Failed to read onboarding from RTDB:', err);
        return null;
    }
}

async function writeFirebaseOnboardingSkip(uid: string) {
    try {
        const { ref, update } = await import('firebase/database');
        const { database } = await import('@/lib/api/firebase');
        const onboardingRef = ref(database, `/users/${uid}/onboarding`);
        await update(onboardingRef, { skipUsernameSetup: true, updatedAt: Date.now() });
    } catch (err) {
        console.warn('[Firebase] Failed to write onboarding skip to RTDB:', err);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(() => {
        const cached = readCachedSession();
        if (cached) {
            setClientSessionHints();
            return cached.user;
        }
        return null;
    });
    const [profile, setProfile] = useState<Profile | null>(() => {
        const cached = readCachedSession();
        return cached ? cached.profile : null;
    });
    const [isLoading, setIsLoading] = useState(() => {
        if (typeof window === 'undefined') return true;
        const cached = readCachedSession();
        return !cached;
    });
    const [skipUsernameSetup, setSkipUsernameSetup] = useState(() => {
        const cached = readCachedSession();
        return cached ? !!cached.skipUsernameSetup : false;
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isLoggingOutRef = useRef(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastVisibilityRefreshAtRef = useRef(0);
    const lastSuccessfulLoadAtRef = useRef(0);

    const logout = useCallback(async (redirectTo?: string) => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        setIsLoggingOut(true);
        if (typeof window !== 'undefined') {
            (window as Window & { __isLoggingOut?: boolean }).__isLoggingOut = true;
        }

        setUser(null);
        setProfile(null);
        setSkipUsernameSetup(false);
        clearCachedSession();
        clearUserTokens();
        clearUnreadCache();
        clearAllClientCaches();
        clearClientSessionHints();

        try {
            const { auth } = await import('@/lib/api/firebase');
            await auth.signOut();
        } catch (err) {
            console.warn('[Firebase] Sign out failed:', err);
        }

        try {
            const win = window as Window & { google?: { accounts: { id: { disableAutoSelect: () => void } } } };
            if (typeof window !== 'undefined' && win.google?.accounts?.id) {
                win.google.accounts.id.disableAutoSelect();
            }
            await authApi.logout();
        } catch { /* Ignore logout errors */ } finally {
            if (typeof document !== 'undefined') {
                const cookiesToClear = ['accessToken', 'refreshToken', 'ff_logged_in'];
                cookiesToClear.forEach(name => {
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname};`;
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;`;
                });
            }
            const target = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.startsWith('/logout')
                ? redirectTo
                : '/login';
            router.push(target);
        }
    }, [router]);

    const loadUser = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
        if (isLoggingOutRef.current) return;
        const silent = options?.silent === true;
        const force = options?.force === true;
        if (!silent) setIsLoading(true);
        try {
            const cached = readCachedSession();
            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

            // Offline mode: Load immediately from cache
            if (isOffline && cached) {
                setUser(cached.user);
                setProfile(cached.profile);
                setSkipUsernameSetup(!!cached.skipUsernameSetup);
                setClientSessionHints();
                lastSuccessfulLoadAtRef.current = cached.savedAt;
                if (!silent) setIsLoading(false);
                return;
            }

            const { auth } = await import('@/lib/api/firebase');
            const firebaseUser = auth.currentUser;

            const hasSessionCookie = typeof document !== 'undefined' && (document.cookie.includes('ff_logged_in=true') || document.cookie.includes('accessToken'));

            if (firebaseUser) {
                if (force || !hasSessionCookie || !cached || !isCachedSessionFresh(cached)) {
                    // Direct API fetch from backend PostgreSQL database
                    let userResponse: User;
                    let profileResponse: Profile | null = null;
                    if (!hasSessionCookie) {
                        const idToken = await firebaseUser.getIdToken(true);
                        const response = await authApi.handshake(idToken);
                        setUserTokens(response.accessToken, response.refreshToken);
                        userResponse = response.user;
                        profileResponse = response.profile as Profile;
                    } else {
                        const response = await authApi.me() as { user: User; profile: Profile };
                        userResponse = response.user;
                        profileResponse = response.profile;
                    }

                    setUser(userResponse);
                    setProfile(profileResponse);
                    setClientSessionHints();

                    const onboarding = await readFirebaseOnboarding(firebaseUser.uid);
                    const isSkipped = !!onboarding?.skipUsernameSetup;
                    setSkipUsernameSetup(isSkipped);
                    writeCachedSession(userResponse, profileResponse, isSkipped);
                    lastSuccessfulLoadAtRef.current = Date.now();

                    if (profileResponse) {
                        void writeFirebaseProfile(firebaseUser.uid, profileResponse);
                    }
                } else {
                    // Session fresh in cache -> load direct user & profile from API/cache
                    setUser(cached.user);
                    setProfile(cached.profile);
                    setSkipUsernameSetup(!!cached.skipUsernameSetup);
                    setClientSessionHints();
                    lastSuccessfulLoadAtRef.current = cached.savedAt;
                }
            } else {
                // If firebaseUser is null, attempt authApi.me() or use fresh cached session
                if (!hasSessionCookie) {
                    setUser(null);
                    setProfile(null);
                    clearCachedSession();
                    clearClientSessionHints();
                    if (!silent) setIsLoading(false);
                    return;
                }
                if (!force && cached && isCachedSessionFresh(cached)) {
                    setUser(cached.user);
                    setProfile(cached.profile);
                    setSkipUsernameSetup(!!cached.skipUsernameSetup);
                    setClientSessionHints();
                    lastSuccessfulLoadAtRef.current = cached.savedAt;
                } else {
                    const response = await authApi.me() as { user: User; profile: Profile };
                    setUser(response.user);
                    setProfile(response.profile);
                    setClientSessionHints();

                    const isSkipped = cached ? !!cached.skipUsernameSetup : false;
                    setSkipUsernameSetup(isSkipped);
                    writeCachedSession(response.user, response.profile, isSkipped);
                    lastSuccessfulLoadAtRef.current = Date.now();
                }
            }
        } catch (error: unknown) {
            const status = (error as { statusCode?: number; status?: number })?.statusCode || (error as { status?: number })?.status;
            const isUnauthorized = error instanceof UnauthorizedError || status === 401;

            if (isUnauthorized) {
                clearCachedSession();
                clearUserTokens();
                clearClientSessionHints();
                clearAllClientCaches();
                setUser(null);
                setProfile(null);
                setSkipUsernameSetup(false);
            } else {
                // Silently fall back to cached session or guest state on 503 / 5xx / network errors
                const cached = readCachedSession();
                if (cached) {
                    setUser(cached.user);
                    setProfile(cached.profile);
                    setSkipUsernameSetup(!!cached.skipUsernameSetup);
                    setClientSessionHints();
                    lastSuccessfulLoadAtRef.current = cached.savedAt;
                } else {
                    try {
                        const { auth } = await import('@/lib/api/firebase');
                        const firebaseUser = auth.currentUser;

                        if (firebaseUser) {
                            const fallbackUser: User = {
                                id: firebaseUser.uid,
                                email: firebaseUser.email || undefined,
                                fullName: firebaseUser.displayName || 'Fresher',
                                username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'user_' + firebaseUser.uid.slice(0, 5),
                                role: Role.USER,
                                isAnonymous: firebaseUser.isAnonymous,
                                createdAt: new Date().toISOString()
                            };
                            setUser(fallbackUser);
                            setProfile(null);
                            setSkipUsernameSetup(true);
                            setClientSessionHints();
                            lastSuccessfulLoadAtRef.current = Date.now();
                        } else {
                            setUser(null);
                            setProfile(null);
                            setSkipUsernameSetup(false);
                        }
                    } catch {
                        setUser(null);
                        setProfile(null);
                        setSkipUsernameSetup(false);
                    }
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProfileState = useCallback((updated: Partial<Profile> & { fullName?: string }, apiSyncTask?: () => Promise<unknown>) => {
        setProfile((prev) => {
            const next = prev ? { ...prev, ...updated } : (updated as Profile);
            if (user) {
                writeCachedSession(user, next, skipUsernameSetup);
            }
            // 2. FIREBASE RTDB SYNC
            import('@/lib/api/firebase').then(({ auth }) => {
                const firebaseUser = auth.currentUser;
                if (firebaseUser) {
                    void writeFirebaseProfile(firebaseUser.uid, next);
                }
            }).catch(() => {});
            return next;
        });

        if (updated.fullName) {
            setUser((prevUser) => {
                if (!prevUser) return null;
                const updatedUser = { ...prevUser, fullName: updated.fullName! };
                setProfile((currentProf) => {
                    if (currentProf) writeCachedSession(updatedUser, currentProf, skipUsernameSetup);
                    return currentProf;
                });
                return updatedUser;
            });
        }

        // 3. BACKGROUND / NON-BLOCKING API SYNC
        if (apiSyncTask) {
            apiSyncTask().catch((err) => {
                console.warn('[ProfileSync] Background API update failed (saved locally & in Firebase):', err);
            });
        }
    }, [user, skipUsernameSetup]);

    useEffect(() => {
        if (user && !isLoggingOutRef.current && typeof document !== 'undefined' && !document.cookie.includes('ff_logged_in=true')) {
            setClientSessionHints();
        }
    }, [user]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        import('@/lib/api/firebase').then(({ auth }) => {
            unsubscribe = auth.onAuthStateChanged((firebaseUser: any) => {
                if (isLoggingOutRef.current) return;
                const hasSessionCookie = typeof document !== 'undefined' && (document.cookie.includes('ff_logged_in=true') || document.cookie.includes('accessToken'));
                if (!firebaseUser && !hasSessionCookie) {
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }
                if (firebaseUser) {
                    loadUser({ silent: false, force: true });
                } else {
                    loadUser({ silent: true });
                }
            });
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [loadUser]);

    const login = useCallback(async (email: string, pass: string) => {
        const response = await authApi.login(email, pass);
        setUserTokens(response.accessToken, response.refreshToken);
        setUser(response.user);
        setProfile(response.profile as Profile);
        setClientSessionHints();
        
        let isSkipped = false;
        if (response.firebaseCustomToken) {
            const { signInWithCustomToken } = await import('firebase/auth');
            const { auth } = await import('@/lib/api/firebase');
            const userCred = await signInWithCustomToken(auth, response.firebaseCustomToken);
            const onboarding = await readFirebaseOnboarding(userCred.user.uid);
            isSkipped = !!onboarding?.skipUsernameSetup;
        }
        setSkipUsernameSetup(isSkipped);
        writeCachedSession(response.user, response.profile as Profile, isSkipped);
        lastSuccessfulLoadAtRef.current = Date.now();
    }, []);

    async function sendOtp(email: string) {
        await authApi.sendOtp(email);
    }

    async function verifyOtp(email: string, code: string, source?: string, ref?: string) {
        const response = await authApi.verifyOtp(email, code, source, ref);
        setUserTokens(response.accessToken, response.refreshToken);
        setUser(response.user);
        setProfile(response.profile as Profile);
        setClientSessionHints();
        
        let isSkipped = false;
        if (response.firebaseCustomToken) {
            const { signInWithCustomToken } = await import('firebase/auth');
            const { auth } = await import('@/lib/api/firebase');
            const userCred = await signInWithCustomToken(auth, response.firebaseCustomToken);
            const onboarding = await readFirebaseOnboarding(userCred.user.uid);
            isSkipped = !!onboarding?.skipUsernameSetup;
        }
        setSkipUsernameSetup(isSkipped);
        writeCachedSession(response.user, response.profile as Profile, isSkipped);
        lastSuccessfulLoadAtRef.current = Date.now();
    }

    async function loginWithGoogle(source?: string, ref?: string) {
        const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
        const { auth } = await import('@/lib/api/firebase');
        const provider = new GoogleAuthProvider();
        
        const userCredential = await signInWithPopup(auth, provider);
        const idToken = await userCredential.user.getIdToken(true);
        
        const response = await authApi.handshake(idToken, ref);
        setUserTokens(response.accessToken, response.refreshToken);
        setUser(response.user);
        setProfile(response.profile as Profile);
        setClientSessionHints();
        
        const onboarding = await readFirebaseOnboarding(userCredential.user.uid);
        const isSkipped = !!onboarding?.skipUsernameSetup;
        setSkipUsernameSetup(isSkipped);
        writeCachedSession(response.user, response.profile as Profile, isSkipped);
        lastSuccessfulLoadAtRef.current = Date.now();
    }

    const refreshUser = useCallback(async () => {
        await loadUser({ silent: true, force: true });
    }, [loadUser]);

    const refreshProfile = useCallback(async () => {
        await loadUser({ silent: true, force: true });
    }, [loadUser]);

    const forceRefreshProfile = useCallback(async () => {
        await loadUser({ force: true });
    }, [loadUser]);

    const skipUsername = useCallback(async () => {
        setSkipUsernameSetup(true);
        const { auth } = await import('@/lib/api/firebase');
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            void writeFirebaseOnboardingSkip(firebaseUser.uid);
            const currentCached = readCachedSession();
            if (currentCached) {
                writeCachedSession(currentCached.user, currentCached.profile, true);
            }
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, profile, isLoading, skipUsernameSetup, login, sendOtp, verifyOtp, loginWithGoogle, logout, refreshUser, refreshProfile, forceRefreshProfile, skipUsername, updateProfileState }}
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
