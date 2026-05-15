import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { storage, secureStorage } from '../lib/storage';
import { authApi, HttpError } from '@fresherflow/api-client';
import type { User, Profile } from '@fresherflow/types';
import { Platform } from 'react-native';

const USER_CACHE_KEY = 'ff_cached_session_v1';
const TOKEN_KEY = 'ff_auth_token_v1';
const AUTH_VISIBILITY_REFRESH_COOLDOWN_MS = 300000;
const SESSION_REVALIDATE_MS = 30 * 60 * 1000;

export type UserAuthContextType = {
  user: User | null;
  profile: Profile | null;
  anonSessionId?: string | null;
  isLoading: boolean;
  login?: (email: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string, source?: string, ref?: string) => Promise<{ firebaseCustomToken?: string } | void>;
  loginWithGoogle?: (token: string, source?: string, ref?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshUser?: () => Promise<void>;
  refreshProfile?: () => Promise<void>;
  setAnonSessionId?: (id: string) => void;
  authTokens?: { accessToken?: string; refreshToken?: string } | null;
};

export const UserAuthContext = createContext<UserAuthContextType | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [anonSessionId, setAnonSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const lastVisibilityRefreshAtRef = useRef(0);
  const lastSuccessfulLoadAtRef = useRef(0);

  const refreshMe = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    // Check if we have a token before hitting the API
    const token = await secureStorage.getItemAsync(TOKEN_KEY);
    if (!token) {
        if (!silent) setIsLoading(false);
        return;
    }

    if (!silent) setIsLoading(true);
    try {
      const data = await authApi.me() as { user?: User; profile?: Profile | null };
      if (data.user) {
        setUser(data.user);
        setProfile(data.profile || data.user.profile || null);
        await storage.setItem(USER_CACHE_KEY, JSON.stringify({ user: data.user, profile: data.profile || null, savedAt: Date.now() }));
        lastSuccessfulLoadAtRef.current = Date.now();
      }
    } catch (error: unknown) {
      if (error instanceof HttpError && error.status === 401) {
        setUser(null);
        setProfile(null);
        await storage.removeItem(USER_CACHE_KEY);
        await secureStorage.deleteItemAsync(TOKEN_KEY);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const raw = await storage.getItem(USER_CACHE_KEY);
        let hasCachedSession = false;
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.user) {
            setUser(cached.user);
            setProfile(cached.profile || cached.user.profile || null);
            lastSuccessfulLoadAtRef.current = cached.savedAt || 0;
            hasCachedSession = true;
          }
        }

        // Only hit the API if we have a token AND it's been more than 30 mins since last successful load
        const token = await secureStorage.getItemAsync(TOKEN_KEY);
        const shouldRefresh = token && (Date.now() - lastSuccessfulLoadAtRef.current > SESSION_REVALIDATE_MS);

        if (shouldRefresh) {
            await refreshMe({ silent: true });
        } else if (!hasCachedSession) {
            // Not logged in or fresh enough cache, stop loading
            setIsLoading(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [refreshMe]);

  // Web-only visibility handlers
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRefreshAtRef.current < AUTH_VISIBILITY_REFRESH_COOLDOWN_MS) return;
      if (now - lastSuccessfulLoadAtRef.current < SESSION_REVALIDATE_MS) return;
      lastVisibilityRefreshAtRef.current = now;
      void refreshMe({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshMe]);

  const sendOtp = useCallback(async (email: string) => {
    await authApi.sendOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, source?: string, ref?: string) => {
    const data = await authApi.verifyOtp(
      email,
      code,
      source || (Platform.OS === 'web' ? 'web' : 'expo_app'),
      ref
    ) as { user?: User; profile?: Profile | null; accessToken?: string; refreshToken?: string; firebaseCustomToken?: string };
    if (data.user) {
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
      }
      await storage.setItem(USER_CACHE_KEY, JSON.stringify({ user: data.user, profile: data.profile || null, savedAt: Date.now() }));
      setUser(data.user);
      setProfile(data.profile || data.user.profile || null);
      return { firebaseCustomToken: data.firebaseCustomToken };
    }
  }, []);

  const loginWithGoogle = useCallback(async (token: string, source?: string, ref?: string) => {
    const data = await authApi.googleLogin(token, source || 'web', ref) as { user?: User; profile?: Profile | null; accessToken?: string; refreshToken?: string };
    if (data.user) {
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
      }
      await storage.setItem(USER_CACHE_KEY, JSON.stringify({ user: data.user, profile: data.profile || null, savedAt: Date.now() }));
      setUser(data.user);
      setProfile(data.profile || data.user.profile || null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
    await storage.removeItem(USER_CACHE_KEY);
    await secureStorage.deleteItemAsync(TOKEN_KEY);

    if (Platform.OS === 'web') {
        // Clear cookies for web
        if (typeof document !== 'undefined') {
          ['accessToken', 'refreshToken', 'ff_logged_in'].forEach(name => {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
          });
        }
        window.location.replace('/login');
    }
  }, []);

  return (
    <UserAuthContext.Provider value={{
        user,
        profile,
        anonSessionId,
        isLoading,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        logout,
        refreshMe,
        refreshUser: refreshMe,
        refreshProfile: refreshMe,
        setAnonSessionId
    }}>
      {children}
    </UserAuthContext.Provider>
  );
}


export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) throw new Error('useUserAuth must be used within UserAuthProvider');
  return context;
}
