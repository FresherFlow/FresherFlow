import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { User } from '@fresherflow/types';
import { secureStorage } from '@repo/frontend-core';
import auth, { FirebaseAuthTypes, initializeAuth } from '@/config/firebase';
import { onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { IdentityManager } from '@/utils/identity';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  anonSessionId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isSyncing: boolean; // True when handshaking with Render API
  setAuth: (user: User, token: string) => void;
  setFirebaseUser: (user: FirebaseAuthTypes.User | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  initAnonSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    user: null,
    firebaseUser: null,
    anonSessionId: null,
    token: null,
    isAuthenticated: false,
    isSyncing: false,
    setAuth: (user, token) => {
      void secureStorage.setItem('ff_auth_token_v1', token);
      set((state) => {
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
        state.isSyncing = false;
      });
    },
    setFirebaseUser: (fbUser) => {
      set((state) => {
        state.firebaseUser = fbUser;
        // Optimistic UX: If we have a Firebase user but no Render user yet,
        // create a partial "optimistic" user object to unblock the UI.
        if (fbUser && !state.user) {
            state.user = {
                id: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || 'User',
                avatar: fbUser.photoURL || undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // @ts-ignore - Temporary optimistic fields
                isOptimistic: true,
            } as any;
            state.isAuthenticated = true;
        }
      });
    },
    setSyncing: (isSyncing) => {
        set((state) => {
            state.isSyncing = isSyncing;
        });
    },
    initAnonSession: async () => {
        const anonId = await IdentityManager.getAnonId();
        set((state) => {
            state.anonSessionId = anonId;
        });
    },
    clearAuth: () => {
      void secureStorage.deleteItemAsync('ff_auth_token_v1');
      void signOut(auth);
      set((state) => {
        state.user = null;
        state.firebaseUser = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isSyncing = false;
      });
    },
    updateUser: (updatedFields) => 
      set((state) => {
        if (state.user) {
          Object.assign(state.user, updatedFields);
        }
      }),
  }))
);

export const AuthManager = {
  initialize: () => {
    // Initialize Google Sign-In & Auth listeners
    initializeAuth();
    
    // Initialize listeners only when explicitly called to avoid race conditions during boot
    onAuthStateChanged(auth, (fbUser) => {
        useAuthStore.getState().setFirebaseUser(fbUser);
    });

    // Initialize anon session
    void useAuthStore.getState().initAnonSession();
  }
};


