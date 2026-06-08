import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { User, Role } from '@fresherflow/types';
import { secureStorage } from '@repo/frontend-core';
import auth, { FirebaseAuthTypes, initializeAuth, isFirebaseAuthAvailable } from '@/config/firebase';
import { Analytics } from '@/utils/analytics';
import { getString, setString, remove } from '@/utils/storage';
import {
  readOnboardingSnapshot,
  saveOnboardingUser,
  writeOnboardingSnapshot,
} from '@/utils/onboardingState';
import {
  readFirebaseOnboardingRecord,
  writeFirebaseOnboardingRecord,
} from '@/utils/firebaseOnboardingDb';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isSyncing: boolean;
  isHandshaking: boolean;
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
  setHandshaking: (isHandshaking: boolean) => void;
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
    isAuthenticated: Boolean(initialCachedUser && !initialCachedUser.isAnonymous),
    isAnonymous: initialCachedUser?.isAnonymous ?? false,
    isSyncing: true,
    isHandshaking: false,
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
      const currentState = get();
      const canKeepLocalUsername =
        !currentState.user?.isAnonymous &&
        Boolean(currentState.user?.username);
      const isAnonymous = user.isAnonymous ?? currentState.firebaseUser?.isAnonymous ?? false;

      const mergedUser = {
        ...user,
        username: user.username || (canKeepLocalUsername ? currentState.user?.username ?? null : null),
        isOptimistic: false,
        isAnonymous,
      };
      void secureStorage.setItem('ff_auth_token_v1', token);
      setString('ff_cached_user_profile_v3', JSON.stringify(mergedUser));
      // Write snapshot under Postgres UUID (primary key for profile operations)
      saveOnboardingUser(mergedUser, get().skipUsernameSetup);
      // ALSO write under Firebase UID so boot-time setFirebaseUser can find it without a handshake
      const fbUid = currentState.firebaseUser?.uid;
      if (fbUid && fbUid !== mergedUser.id) {
        writeOnboardingSnapshot(fbUid, {
          user: { ...mergedUser, id: fbUid }, // Keep Firebase UID as id in this snapshot
          profile: mergedUser.profile || readOnboardingSnapshot(mergedUser.id)?.profile || null,
          skipUsernameSetup: get().skipUsernameSetup || Boolean(mergedUser.username),
        });
      }
      void writeFirebaseOnboardingRecord(currentState.firebaseUser, {
        username: mergedUser.username,
        fullName: mergedUser.fullName,
        skipUsernameSetup: get().skipUsernameSetup || Boolean(mergedUser.username),
      });
      Analytics.identify(mergedUser);
      set((state) => {
        state.user = mergedUser;
        state.token = token;
        state.isAuthenticated = !isAnonymous;
        state.isAnonymous = isAnonymous;
        state.isSyncing = false;
        // Never let a backend response reset skipUsernameSetup — user already acted on it
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
        } else if (fbUser.isAnonymous) {
            if (!state.user || state.user.id !== fbUser.uid || !state.user.isAnonymous) {
                console.log('[Auth] Active Firebase session is anonymous. Using guest session:', fbUser.uid);
                if (state.user && !state.user.isAnonymous) {
                    state.token = null;
                    remove('ff_cached_user_profile_v3');
                    void secureStorage.deleteItemAsync('ff_auth_token_v1');
                }
                state.user = {
                    id: fbUser.uid,
                    email: undefined,
                    fullName: 'Guest Explorer',
                    role: Role.USER,
                    username: null,
                    isAnonymous: true,
                    createdAt: new Date().toISOString(),
                    isOptimistic: true,
                };
            }
            state.isAuthenticated = false;
        } else if (!state.user || state.user.id !== fbUser.uid || state.user.isOptimistic || state.user.isAnonymous) {
            // Try snapshot by Firebase UID first (set by setAuth after handshake)
            // Fall back to Postgres UUID key (stored before this fix was deployed)
            const cached =
                readOnboardingSnapshot(fbUser.uid) ??
                (state.user?.id && state.user.id !== fbUser.uid ? readOnboardingSnapshot(state.user.id) : null);
            const fallbackUser: User = {
                id: fbUser.uid,
                email: fbUser.email || undefined,
                fullName: fbUser.displayName || 'User',
                role: Role.USER,
                username: null,
                isAnonymous: false,
                createdAt: new Date().toISOString(),
                isOptimistic: true,
            };
            const cachedUser = cached?.user
                ? {
                    ...fallbackUser,
                    ...cached.user,
                    id: fbUser.uid,
                    email: cached.user.email || fbUser.email || undefined,
                    fullName: cached.user.fullName || fbUser.displayName || 'User',
                    isAnonymous: false,
                    isOptimistic: cached.user.isOptimistic ?? !cached.user.username,
                }
                : fallbackUser;
            console.log('[Auth] Hydrating real Firebase user from onboarding cache:', cachedUser.username || 'no-handle');
            state.user = cachedUser;
            state.isAuthenticated = true;
            if (cached?.skipUsernameSetup) {
                state.skipUsernameSetup = true;
                state.isSkipLoaded = true;
            }
            if (!cached?.user?.username) {
                state.isSyncing = true;
                void readFirebaseOnboardingRecord(fbUser)
                    .then((record) => {
                        useAuthStore.setState((current) => {
                            if (!current.user || current.user.id !== fbUser.uid || current.user.isAnonymous) {
                                current.isSyncing = false;
                                return;
                            }
                            if (!record) {
                                current.isSyncing = false;
                                return;
                            }
                            const nextUser = {
                                ...current.user,
                                username: record.username || current.user.username,
                                fullName: record.fullName || current.user.fullName,
                                isOptimistic: !record.username,
                            };
                            saveOnboardingUser(nextUser, record.skipUsernameSetup || Boolean(record.username));
                            current.user = nextUser;
                            current.skipUsernameSetup = current.skipUsernameSetup || Boolean(record.skipUsernameSetup || record.username);
                            current.isSkipLoaded = true;
                            current.isSyncing = false;
                        });
                    })
                    .catch(() => {
                        useAuthStore.setState({ isSyncing: false });
                    });
            }
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
    setHandshaking: (isHandshaking) => {
        set((state) => {
            state.isHandshaking = isHandshaking;
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
        // Unregister FCM token before signing out so this device stops receiving pushes
        try {
            const messaging = require('@react-native-firebase/messaging').default;
            const token = await messaging().getToken();
            if (token) {
                const { deviceTokenApi } = require('@fresherflow/api-client');
                void deviceTokenApi.unregister(token);
            }
        } catch {
            // FCM not available or token fetch failed — safe to ignore
        }

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
        state.isHandshaking = false;
      });
    },
    updateUser: (updatedFields) => {
      console.log('[AuthStore] updateUser called with:', updatedFields);
      set((state) => {
        if (state.user) {
          state.user = { ...state.user, ...updatedFields };
          Analytics.identify(state.user);
          setString('ff_cached_user_profile_v3', JSON.stringify(state.user));
          if (!state.user.isAnonymous) {
            saveOnboardingUser(state.user, state.skipUsernameSetup);
            void writeFirebaseOnboardingRecord(state.firebaseUser, {
              username: state.user.username,
              fullName: state.user.fullName,
              skipUsernameSetup: state.skipUsernameSetup || Boolean(state.user.username),
            });
          }
        }
      });
    },
    skipUsername: () => {
      console.log('[AuthStore] skipUsername called');
      void secureStorage.setItem('ff_skip_username_setup_v1', 'true');
      set((state) => {
        console.log('[AuthStore] Setting skipUsernameSetup to true in Zustand state');
        state.skipUsernameSetup = true;
        state.isSkipLoaded = true; // Prevents startup async read from overwriting this
        if (state.user && !state.user.isAnonymous) {
          writeOnboardingSnapshot(state.user.id, {
            user: state.user,
            profile: state.user.profile || readOnboardingSnapshot(state.user.id)?.profile || null,
            skipUsernameSetup: true,
          });
          void writeFirebaseOnboardingRecord(state.firebaseUser, {
            username: state.user.username,
            fullName: state.user.fullName,
            skipUsernameSetup: true,
          });
        }
      });
    },
  }))
);

export const AuthManager = {
  initialize: async () => {
    // Hard startup timeout — if ANYTHING hangs (Firebase, storage, network),
    // force-unblock the app after 8 seconds so users never see infinite loading.
    const startupTimeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isSyncing || !state.isSkipLoaded) {
        console.warn('[Auth] Startup timeout fired. Force-unblocking app.');
        useAuthStore.setState({ isSyncing: false, isSkipLoaded: true });
      }
    }, 8000);

    // Initialize Google Sign-In & native modules
    initializeAuth();

    // 0. Load the JWT token locally so the app can start making API calls immediately without a backend handshake
    void secureStorage.getItem('ff_auth_token_v1').then(token => {
      if (token) {
        console.log('[Auth] Restored JWT token from secureStorage');
        useAuthStore.setState({ token });
      }
    });

    // 1. Asynchronous Hybrid Hydration Fallback
    try {
      const currentStoreUser = useAuthStore.getState().user;
      if (!currentStoreUser || currentStoreUser.isOptimistic) {
        console.log('[Auth] Profile empty or optimistic. Running async hybrid hydration fallback...');
        const keys = await AsyncStorage.getAllKeys();
        const targetKey = keys.find((k: string) => k.endsWith('ff_cached_user_profile_v3'));
        if (targetKey) {
          const raw = await AsyncStorage.getItem(targetKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
              console.log('[Auth] Hybrid Hydration fallback successful:', parsed.username);
              useAuthStore.setState({
                user: parsed,
                isAuthenticated: !parsed.isAnonymous,
                isAnonymous: parsed.isAnonymous ?? false,
                isSyncing: false,
              });
            }
          }
        }
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
      useAuthStore.setState((current) => {
        const snapshotSkipped = current.user && !current.user.isAnonymous
          ? readOnboardingSnapshot(current.user.id)?.skipUsernameSetup
          : false;
        const legacyCompletedUser = Boolean(current.user?.username && skipped === 'true');
        return {
          skipUsernameSetup: current.skipUsernameSetup || Boolean(snapshotSkipped) || legacyCompletedUser,
          isSkipLoaded: true,
        };
      });
    });

    if (!isFirebaseAuthAvailable()) {
      console.warn('[Auth] Firebase native auth unavailable. Skipping Firebase listeners.');
      useAuthStore.setState({ isSyncing: false, isSkipLoaded: true });
      clearTimeout(startupTimeout);
      return;
    }

    let hasResolvedAuthState = false;
    // 4. Initialize Firebase auth listeners
    auth().onAuthStateChanged((fbUser) => {
      useAuthStore.getState().setFirebaseUser(fbUser);
      clearTimeout(startupTimeout);
      
      if (!hasResolvedAuthState) {
        hasResolvedAuthState = true;
        if (!fbUser) {
          // Only initiate automatic guest session if onboarding has already been completed in the past
          AsyncStorage.getItem('ff_onboarding_completed').then((completed) => {
            if (completed === 'true') {
              console.log('[Auth] No active session restored. Initiating automatic guest session...');
              void useAuthStore.getState().ensureSession();
            } else {
              console.log('[Auth] First run / Onboarding active. Bypassing automatic guest session to let user authenticate.');
            }
          }).catch(() => {
            console.log('[Auth] Error reading onboarding status. Bypassing automatic guest session.');
          });
        } else {
          console.log('[Auth] Restored active session on boot:', fbUser.uid, fbUser.isAnonymous ? '(Guest)' : '(Member)');
        }
      }
    });
  }
};
