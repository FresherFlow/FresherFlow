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
  isLoading: boolean;
  login?: (email: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string, source?: string, ref?: string) => Promise<void>;
  loginWithGoogle?: (token: string, source?: string, ref?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshUser?: () => Promise<void>;
  refreshProfile?: () => Promise<void>;
  authTokens?: { accessToken?: string; refreshToken?: string } | null;
};

export const UserAuthContext = createContext<UserAuthContextType | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastVisibilityRefreshAtRef = useRef(0);
  const lastSuccessfulLoadAtRef = useRef(0);

  const refreshMe = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
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
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.user) {
            setUser(cached.user);
            setProfile(cached.profile || cached.user.profile || null);
            lastSuccessfulLoadAtRef.current = cached.savedAt || 0;
          }
        }
        await refreshMe({ silent: true });
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
    ) as { user?: User; profile?: Profile | null; accessToken?: string; refreshToken?: string };
    if (data.user) {
      setUser(data.user);
      setProfile(data.profile || data.user.profile || null);
      await storage.setItem(USER_CACHE_KEY, JSON.stringify({ user: data.user, profile: data.profile || null, savedAt: Date.now() }));
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
      }
    }
  }, []);

  const loginWithGoogle = useCallback(async (token: string, source?: string, ref?: string) => {
    const data = await authApi.googleLogin(token, source || 'web', ref) as { user?: User; profile?: Profile | null; accessToken?: string; refreshToken?: string };
    if (data.user) {
      setUser(data.user);
      setProfile(data.profile || data.user.profile || null);
      await storage.setItem(USER_CACHE_KEY, JSON.stringify({ user: data.user, profile: data.profile || null, savedAt: Date.now() }));
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
      }
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
        isLoading, 
        sendOtp, 
        verifyOtp, 
        loginWithGoogle,
        logout, 
        refreshMe,
        refreshUser: refreshMe,
        refreshProfile: refreshMe
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
