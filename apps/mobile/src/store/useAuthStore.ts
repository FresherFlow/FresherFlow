import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { User, Role } from '@fresherflow/types';
import { secureStorage } from '@repo/frontend-core';
import auth, { FirebaseAuthTypes, initializeAuth, isFirebaseAuthAvailable } from '@/config/firebase';
import { Analytics } from '@/utils/analytics';
import { getString, setString, remove } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isSyncing: boolean;
  token: string | null;
  referralCode: string | null;
  skipUsernameSetup: boolean;
  isSkipLoaded: boolean;
  handshakeTrigger: number;
  triggerHandshake: () => void;
  setAuth: (user: User, token: string) => void;
  setReferralCode: (code: string | null) => void;
  setFirebaseUser: (user: FirebaseAuthTypes.User | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  skipUsername: () => void;
  ensureSession: () => Promise<void>;
}

// Synchronously read the cached user profile on startup from MMKV to eliminate auth race conditions
const getCachedUserSync = (): User | null => {
  try {
    const raw = getString('ff_cached_user_profile_v3');
    console.log('[Auth] MMKV getCachedUserSync raw payload:', raw);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[Auth] MMKV getCachedUserSync parsed profile:', parsed);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.error('[Auth] MMKV getCachedUserSync failed:', e);
  }
  return null;
};

const initialCachedUser = getCachedUserSync();

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    user: initialCachedUser,
    firebaseUser: null,
    isAuthenticated: initialCachedUser !== null,
    isAnonymous: false,
    isSyncing: true,
    token: null,
    referralCode: null,
    skipUsernameSetup: false,
    isSkipLoaded: false,
    handshakeTrigger: 0,
    triggerHandshake: () => {
      set((state) => {
        state.handshakeTrigger += 1;
      });
    },
    setAuth: (user, token) => {
      console.log('[Auth] setAuth called. Saving to MMKV...', user);
      void secureStorage.setItem('ff_auth_token_v1', token);
      setString('ff_cached_user_profile_v3', JSON.stringify(user));
      Analytics.identify(user);
      set((state) => {
        state.user = { ...user, isOptimistic: false, isAnonymous: false };
        state.token = token;
        state.isAuthenticated = true;
        state.isAnonymous = false;
        state.isSyncing = false;
      });
    },
    setReferralCode: (code) => {
      if (code) {
        void secureStorage.setItem('ff_pending_referral', code);
      } else {
        void secureStorage.deleteItemAsync('ff_pending_referral');
      }
      set((state) => {
        state.referralCode = code;
      });
    },
    setFirebaseUser: (fbUser) => {
      console.log('[Auth] setFirebaseUser listener triggered. fbUser UID:', fbUser?.uid || 'null');
      set((state) => {
        state.firebaseUser = fbUser;
        state.isAnonymous = fbUser?.isAnonymous ?? false;
        state.isSyncing = false;

        if (!fbUser) {
            // Keep the real, active cached user session on offline boot to prevent automated logouts
            if (!state.user || state.user.isOptimistic) {
                console.log('[Auth] No Firebase user and no active real cached session. Clearing store.');
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
            } else {
                console.log('[Auth] Offline/boot transient null. Preserving active cached session:', state.user.username);
            }
        } else if (!state.user || (state.user.isOptimistic && state.user.id !== fbUser.uid)) {
            console.log('[Auth] Overwriting empty or optimistic session with fresh Firebase identity:', fbUser.uid);
            // Optimistic UX: If we have a Firebase user but no Render user yet (or identity changed),
            // create a partial "optimistic" user object to unblock the UI.
            state.user = {
                id: fbUser.uid,
                email: fbUser.email || undefined,
                fullName: fbUser.isAnonymous ? 'Guest Explorer' : (fbUser.displayName || 'User'),
                role: Role.USER,
                username: null,
                isAnonymous: fbUser.isAnonymous,
                createdAt: new Date().toISOString(),
                isOptimistic: true,
            };
            // Anonymous users are technically authenticated in Firebase,
            // but we treat them as guests in our app logic.
            state.isAuthenticated = !fbUser.isAnonymous;
        } else {
            console.log('[Auth] Preserving fully-hydrated cached user profile:', state.user.username);
        }
      });
    },
    setSyncing: (isSyncing) => {
        set((state) => {
            state.isSyncing = isSyncing;
        });
    },
    ensureSession: async () => {
        if (!isFirebaseAuthAvailable()) return;
        if (!auth().currentUser) {
            console.log('[Auth] No session found on startup. Ensuring anonymous session...');
            try {
                await auth().signInAnonymously();
            } catch (err) {
                console.error('[Auth] Failed to sign in anonymously:', err);
            }
        }
    },
    logout: async () => {
      try {
        if (isFirebaseAuthAvailable() && auth().currentUser) {
          await auth().signOut();
        }
        get().clearAuth();
      } catch (error) {
        console.error('[Auth] Logout failed:', error);
        // Still clear local auth even if firebase signout fails
        get().clearAuth();
      }
    },
    clearAuth: () => {
      console.log('[Auth] clearAuth triggered. Wiping local MMKV profile cache.');
      Analytics.identify(null);
      void secureStorage.deleteItemAsync('ff_auth_token_v1');
      remove('ff_cached_user_profile_v3');
      if (isFirebaseAuthAvailable()) void auth().signOut();
      set((state) => {
        state.user = null;
        state.firebaseUser = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isAnonymous = false;
        state.isSyncing = false;
      });
    },
    updateUser: (updatedFields) =>
      set((state) => {
        if (state.user) {
          console.log('[Auth] updateUser called. Merging fields & saving to MMKV:', updatedFields);
          Object.assign(state.user, updatedFields);
          Analytics.identify(state.user);
          setString('ff_cached_user_profile_v3', JSON.stringify(state.user));
        }
      }),
    skipUsername: () => {
      void secureStorage.setItem('ff_skip_username_setup_v1', 'true');
      set((state) => {
        state.skipUsernameSetup = true;
      });
    },
  }))
);

export const AuthManager = {
  initialize: async () => {
    // Initialize Google Sign-In & native modules
    initializeAuth();

    // 1. Asynchronous Hybrid Hydration Fallback (supports both synchronous native MMKV and asynchronous mock MMKV)
    try {
      const currentStoreUser = useAuthStore.getState().user;
      if (!currentStoreUser || currentStoreUser.isOptimistic) {
        console.log('[Auth] Profile empty or optimistic. Running async hybrid hydration fallback...');
        const keys = await AsyncStorage.getAllKeys();
        const targetKey = keys.find((k: string) => k.endsWith('ff_cached_user_profile_v3'));
        if (targetKey) {
          const raw = await AsyncStorage.getItem(targetKey);
          console.log('[Auth] Hybrid Hydration fallback raw payload:', raw);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
              console.log('[Auth] Hybrid Hydration fallback successful:', parsed.username);
              useAuthStore.setState({
                user: parsed,
                isAuthenticated: true,
                isSyncing: false,
              });
            }
          }
        }
      } else {
        console.log('[Auth] Synchronous profile already hydrated:', currentStoreUser.username);
      }
    } catch (err) {
      console.warn('[Auth] Hybrid Hydration fallback failed:', err);
    }

    // 2. Load pending referral code
    void secureStorage.getItem('ff_pending_referral').then(code => {
      if (code) useAuthStore.getState().setReferralCode(code);
    });

    // 3. Load skip username setup state
    void secureStorage.getItem('ff_skip_username_setup_v1').then(skipped => {
      useAuthStore.setState({
        skipUsernameSetup: skipped === 'true',
        isSkipLoaded: true
      });
    });

    if (!isFirebaseAuthAvailable()) {
      console.warn('[Auth] Firebase native auth unavailable. Skipping Firebase listeners.');
      useAuthStore.setState({ isSyncing: false });
      return;
    }

    // 4. Initialize Firebase auth listeners only AFTER profile cache is hydrated
    auth().onAuthStateChanged((fbUser) => {
      useAuthStore.getState().setFirebaseUser(fbUser);
    });

    // 5. Initialize session (Anonymous login if needed)
    void useAuthStore.getState().ensureSession();
  }
};
