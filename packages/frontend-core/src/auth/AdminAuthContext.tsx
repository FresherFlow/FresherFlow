import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { storage, secureStorage } from '../lib/storage';
import { adminAuthApi, HttpError, AuthenticationResponseJSON, RegistrationResponseJSON } from '@fresherflow/api-client';
import type { Admin } from '@fresherflow/types';
import { Platform } from 'react-native';

const ADMIN_CACHE_KEY = 'ff_cached_admin_session_v1';
const TOKEN_KEY = 'ff_auth_token_v1';
const ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS = 300000;
const ADMIN_SESSION_REVALIDATE_MS = 30 * 60 * 1000;

export type AdminAuthContextType = {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  verifyTotp: (email: string, code: string) => Promise<void>;
  getPasskeys: () => Promise<{ keys: Array<{ id: string, name: string }> }>;
  registerPasskey: () => Promise<void>;
  deletePasskey: (id: string) => Promise<void>;
  getPasskeyOptions: (email: string) => Promise<unknown>;
  verifyPasskey: (email: string, assertion: unknown) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refresh?: () => Promise<void>;
  totpGenerate: () => Promise<{ secret: string; qrCode: string }>;
  totpVerifySetup: (code: string) => Promise<void>;
  totpDisable: () => Promise<void>;
};

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastVisibilityRefreshAtRef = useRef(0);
  const lastSuccessfulLoadAtRef = useRef(0);

  const refreshMe = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setIsLoading(true);
    try {
      const data = await adminAuthApi.me();
      const a = data.admin ?? null;
      setAdmin(prev => (JSON.stringify(prev) === JSON.stringify(a) ? prev : a));
      if (a) {
        await storage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ admin: a, savedAt: Date.now() }));
        lastSuccessfulLoadAtRef.current = Date.now();
      } else {
        await storage.removeItem(ADMIN_CACHE_KEY);
      }
    } catch (error: unknown) {
      if (error instanceof HttpError && error.status === 401) {
        setAdmin(null);
        await storage.removeItem(ADMIN_CACHE_KEY);
        await secureStorage.deleteItemAsync(TOKEN_KEY);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const raw = await storage.getItem(ADMIN_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.admin) {
            setAdmin(cached.admin);
            lastSuccessfulLoadAtRef.current = cached.savedAt || 0;
          }
        }
      } finally {
        setIsLoading(false);
        void refreshMe({ silent: true });
      }
    };
    void bootstrap();
  }, [refreshMe]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRefreshAtRef.current < ADMIN_VISIBILITY_REFRESH_COOLDOWN_MS) return;
      if (now - lastSuccessfulLoadAtRef.current < ADMIN_SESSION_REVALIDATE_MS) return;
      lastVisibilityRefreshAtRef.current = now;
      void refreshMe({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshMe]);

  const verifyTotp = useCallback(async (email: string, code: string) => {
    const data = await adminAuthApi.verifyLoginTotp(email, code);
    if (data.verified) {
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
        if (Platform.OS !== 'web') {
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - React Native Firebase Auth is optional and dynamically imported
            const firebaseAuthModule = await import('@react-native-firebase/auth');
            const auth = firebaseAuthModule.default as unknown as () => { signInWithCustomToken: (token: string) => Promise<unknown> };
            const { firebaseToken } = await adminAuthApi.getFirebaseToken();
            await auth().signInWithCustomToken(firebaseToken);
          } catch (firebaseErr) {
            console.error('Firebase Auth error in verifyTotp:', firebaseErr);
          }
        }
      }
      await refreshMe();
    } else {
      throw new Error('Verification failed');
    }
  }, [refreshMe]);

  const getPasskeyOptions = useCallback(async (email: string) => {
    return adminAuthApi.getLoginOptions(email);
  }, []);

  const verifyPasskey = useCallback(async (email: string, assertion: unknown) => {
    const data = await adminAuthApi.verifyLogin(email, assertion as AuthenticationResponseJSON);
    if (data.verified) {
      if (data.accessToken) {
        await secureStorage.setItemAsync(TOKEN_KEY, data.accessToken);
        if (Platform.OS !== 'web') {
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - React Native Firebase Auth is optional and dynamically imported
            const firebaseAuthModule = await import('@react-native-firebase/auth');
            const auth = firebaseAuthModule.default as unknown as () => { signInWithCustomToken: (token: string) => Promise<unknown> };
            const { firebaseToken } = await adminAuthApi.getFirebaseToken();
            await auth().signInWithCustomToken(firebaseToken);
          } catch (firebaseErr) {
            console.error('Firebase Auth error in verifyPasskey:', firebaseErr);
          }
        }
      }
      await refreshMe();
    } else {
      throw new Error('Passkey verification failed');
    }
  }, [refreshMe]);

  const getPasskeys = useCallback(async () => {
    return adminAuthApi.getPasskeys();
  }, []);

  const registerPasskey = useCallback(async () => {
    if (!admin?.email) throw new Error('Admin profile is required to register a passkey');
    const options = await adminAuthApi.getRegistrationOptions(admin.email);
    const { Passkey } = await import('react-native-passkey');
    const attestation = await Passkey.create(options as never);
    const result = await adminAuthApi.verifyRegistration(admin.email, attestation as RegistrationResponseJSON);
    if (!result.verified) throw new Error('Passkey registration failed');
  }, [admin?.email]);

  const deletePasskey = useCallback(async (id: string) => {
    await adminAuthApi.deletePasskey(id);
  }, []);

  const totpGenerate = useCallback(async () => {
    return adminAuthApi.generateTotp();
  }, []);

  const totpVerifySetup = useCallback(async (code: string) => {
    const result = await adminAuthApi.verifyTotp(code);
    if (!result.success) throw new Error('Invalid TOTP code');
    await refreshMe();
  }, [refreshMe]);

  const totpDisable = useCallback(async () => {
    await adminAuthApi.disableTotp();
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const firebaseAuthModule = await import('@react-native-firebase/auth');
        const auth = firebaseAuthModule.default as unknown as () => { signOut: () => Promise<unknown> };
        await auth().signOut();
      } catch (firebaseErr) {
        console.error('Firebase Auth signout error:', firebaseErr);
      }
    }

    try {
      await adminAuthApi.logout();
    } catch {
      // ignore
    }
    setAdmin(null);
    await storage.removeItem(ADMIN_CACHE_KEY);
    await secureStorage.deleteItemAsync(TOKEN_KEY);

    if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          document.cookie = 'ff_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
        window.location.replace('/admin/login');
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      admin, 
      isLoading,
      isAuthenticated: !!admin,
      verifyTotp, 
      getPasskeys, 
      registerPasskey, 
      deletePasskey, 
      getPasskeyOptions, 
      verifyPasskey,
      logout, 
      refreshMe,
      refresh: refreshMe,
      totpGenerate, 
      totpVerifySetup, 
      totpDisable,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
