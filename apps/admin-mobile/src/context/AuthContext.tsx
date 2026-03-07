import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HttpError, saveToken, deleteToken, setUnauthorizedHandler } from '../lib/http';
import { ADMIN_CACHE_KEY } from '../lib/constants';
import { Auth, Totp, type TotpGenerateResponse } from '../lib/api';
import { setUserContext, clearUserContext } from '../lib/sentry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Admin = {
  id: string;
  email: string;
  fullName: string;
  totpEnabled: boolean;
  totpEnabledAt?: string | null;
};

type AuthContextType = {
  admin: Admin | null;
  isLoading: boolean;
  /** TOTP-based login (primary fallback path) */
  verifyTotp: (email: string, code: string) => Promise<void>;
  /** Passkey-based login — step 1: get challenge options */
  getPasskeyOptions: (email: string) => Promise<unknown>;
  /** Passkey-based login — step 2: submit assertion */
  verifyPasskey: (email: string, assertion: unknown) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** TOTP setup — generate secret + QR URI */
  totpGenerate: () => Promise<TotpGenerateResponse>;
  /** TOTP setup — confirm 6-digit code to enable */
  totpVerifySetup: (code: string) => Promise<void>;
  /** TOTP disable */
  totpDisable: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Logout (defined early so we can register as 401 handler) ──────────────
  const logout = useCallback(async () => {
    try {
      await Auth.logout();
    } catch {
      // ignore network errors on logout
    }
    clearUserContext();
    setAdmin(null);
    await AsyncStorage.removeItem(ADMIN_CACHE_KEY);
    await deleteToken();
  }, []);

  // Register global 401 handler once so any screen auto-logs out on expiry
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
  }, [logout]);

  // ── Session bootstrap ──────────────────────────────────────────────────────
  const refreshMe = useCallback(async () => {
    try {
      const data = await Auth.me();
      const a = data.admin as Admin | null;
      setAdmin(a ?? null);
      if (a) {
        await AsyncStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(a));
        setUserContext(a.id, a.email);
      } else {
        await AsyncStorage.removeItem(ADMIN_CACHE_KEY);
        clearUserContext();
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        setAdmin(null);
        clearUserContext();
        await AsyncStorage.removeItem(ADMIN_CACHE_KEY);
        await deleteToken();
      }
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Serve cached admin IMMEDIATELY — no waiting for network
        const raw = await AsyncStorage.getItem(ADMIN_CACHE_KEY);
        if (raw) {
          setAdmin(JSON.parse(raw) as Admin);
        }
      } finally {
        // Show the app right away, then refresh session in the background
        setIsLoading(false);
        void refreshMe(); // background verify — will logout if token expired
      }
    };
    void bootstrap();
  }, [refreshMe]);

  // ── TOTP login ────────────────────────────────────────────────────────────
  const verifyTotp = useCallback(async (email: string, code: string) => {
    const data = await Auth.loginTotp(email, code);
    if (data.verified) {
      if (data.accessToken) await saveToken(data.accessToken);
      await refreshMe();
    } else {
      throw new Error('Verification failed');
    }
  }, [refreshMe]);

  // ── Passkey login — step 1 ────────────────────────────────────────────────
  const getPasskeyOptions = useCallback(async (email: string) => {
    return Auth.loginOptions(email);
  }, []);

  // ── Passkey login — step 2 ────────────────────────────────────────────────
  const verifyPasskey = useCallback(async (email: string, assertion: unknown) => {
    const data = await Auth.loginVerify(email, assertion);
    if (data.verified) {
      if (data.accessToken) await saveToken(data.accessToken);
      await refreshMe();
    } else {
      throw new Error('Passkey verification failed');
    }
  }, [refreshMe]);

  // ── TOTP management ───────────────────────────────────────────────────────
  const totpGenerate = useCallback(async () => {
    return Totp.generate();
  }, []);

  const totpVerifySetup = useCallback(async (code: string) => {
    const result = await Totp.verify(code);
    if (!result.verified) throw new Error('Invalid TOTP code');
    // Refresh admin profile so totpEnabled flips to true
    await refreshMe();
  }, [refreshMe]);

  const totpDisable = useCallback(async () => {
    await Totp.disable();
    await refreshMe();
  }, [refreshMe]);

  return (
    <AuthContext.Provider value={{
      admin, isLoading,
      verifyTotp, getPasskeyOptions, verifyPasskey,
      logout, refreshMe,
      totpGenerate, totpVerifySetup, totpDisable,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
