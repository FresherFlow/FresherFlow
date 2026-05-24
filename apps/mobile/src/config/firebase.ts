import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import Constants from 'expo-constants';

type NativeFirebaseAuthModule = {
  default?: () => FirebaseAuthTypes.Module;
  GoogleAuthProvider?: {
    credential: (idToken: string) => FirebaseAuthTypes.AuthCredential;
  };
  OAuthProvider?: new (providerId: string) => {
    credential: (options: { idToken?: string; accessToken?: string }) => FirebaseAuthTypes.AuthCredential;
  };
};

let nativeAuthModule: NativeFirebaseAuthModule | null | undefined;

function loadNativeAuthModule(): NativeFirebaseAuthModule | null {
  if (nativeAuthModule !== undefined) return nativeAuthModule;
  try {
    // Native Firebase is only available in a dev client or Android/iOS build.
    // Expo Go does not contain this native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeAuthModule = require('@react-native-firebase/auth') as NativeFirebaseAuthModule;
  } catch (error) {
    console.warn('[Firebase] Native Firebase auth unavailable. Use an Expo dev client or Android build.', error);
    nativeAuthModule = null;
  }
  return nativeAuthModule;
}

export function isFirebaseAuthAvailable(): boolean {
  return Boolean(loadNativeAuthModule()?.default);
}

const getGoogleWebClientId = () => {
  const appEnv = Constants.expoConfig?.extra?.appEnv || 'development';
  if (appEnv === 'production') {
    return '346180935352-mr0jnrbqo9382vg987mb8ms4otfgmh1j.apps.googleusercontent.com';
  }
  // Dev & Staging share the fresherflow-dev-staging project
  return '162796656158-p6776o53i5efnse8i6bjujptms4at6fj.apps.googleusercontent.com';
};

export const getFirebaseDatabaseUrl = (): string => {
  // Prefer env-injected URL (set per environment in .env → app.config.js → extra)
  const fromEnv = Constants.expoConfig?.extra?.firebaseRtdbUrl as string | undefined;
  if (fromEnv) return fromEnv;

  // Fallback by appEnv in case env var is missing (both DBs are in Singapore)
  const appEnv = Constants.expoConfig?.extra?.appEnv || 'development';
  if (appEnv === 'production') {
    return 'https://fresherflow-3604b-default-rtdb.asia-southeast1.firebasedatabase.app';
  }
  return 'https://fresherflow-dev-staging-default-rtdb.asia-southeast1.firebasedatabase.app';
};

export const getFirebaseAuthDomain = (): string => {
  const appEnv = Constants.expoConfig?.extra?.appEnv || 'development';
  if (appEnv === 'production') {
    return 'fresherflow-3604b.firebaseapp.com';
  }
  return 'fresherflow-dev-staging.firebaseapp.com';
};

export const initializeAuth = () => {
  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
    offlineAccess: true,
  });
  loadNativeAuthModule();
};

const auth = (): FirebaseAuthTypes.Module => {
  const authFactory = loadNativeAuthModule()?.default;
  if (!authFactory) {
    throw new Error('Firebase native auth is unavailable. Run a development client or Android build, not Expo Go.');
  }
  return authFactory();
};

export function createGoogleCredential(idToken: string): FirebaseAuthTypes.AuthCredential {
  const provider = loadNativeAuthModule()?.GoogleAuthProvider;
  if (!provider) throw new Error('Google Firebase provider is unavailable in this runtime.');
  return provider.credential(idToken);
}

export function createAppleCredential(options: { idToken?: string; accessToken?: string }): FirebaseAuthTypes.AuthCredential {
  const OAuthProvider = loadNativeAuthModule()?.OAuthProvider;
  if (!OAuthProvider) throw new Error('Apple Firebase provider is unavailable in this runtime.');
  return new OAuthProvider('apple.com').credential(options);
}

export { auth };
export type { FirebaseAuthTypes };
export default auth;
