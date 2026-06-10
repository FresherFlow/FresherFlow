import firebaseAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
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
    // Statically imported to guarantee standard CJS/ESM interop under Hermes
    nativeAuthModule = firebaseAuth as unknown as NativeFirebaseAuthModule;
  } catch (error) {
    console.warn('[Firebase] Native Firebase auth unavailable. Use an Expo dev client or Android build.', error);
    nativeAuthModule = null;
  }
  return nativeAuthModule;
}

export function isFirebaseAuthAvailable(): boolean {
  const module = loadNativeAuthModule();
  return Boolean(module && (typeof module === 'function' || typeof module.default === 'function'));
}

const getGoogleWebClientId = () => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.appEnv || 'development';
  if (appEnv === 'production') {
    return '346180935352-mr0jnrbqo9382vg987mb8ms4otfgmh1j.apps.googleusercontent.com';
  }
  // Dev & Staging share the fresherflow-dev-staging project
  return '162796656158-p6776o53i5efnse8i6bjujptms4at6fj.apps.googleusercontent.com';
};

export const getFirebaseDatabaseUrl = (): string => {
  // Prefer env-injected URL directly from process.env
  const fromEnv = process.env.EXPO_PUBLIC_FIREBASE_RTDB_URL || Constants.expoConfig?.extra?.firebaseRtdbUrl as string | undefined;
  if (fromEnv) return fromEnv;

  // Fallback by appEnv in case env var is missing (both DBs are in Singapore)
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.appEnv || 'development';
  if (appEnv === 'production') {
    return 'https://fresherflow-3604b-default-rtdb.asia-southeast1.firebasedatabase.app';
  }
  return 'https://fresherflow-dev-staging-default-rtdb.asia-southeast1.firebasedatabase.app';
};

export const getFirebaseAuthDomain = (): string => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.appEnv || 'development';
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
  const module = loadNativeAuthModule();
  const authFactory = module && (typeof module === 'function' ? module : module.default);
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
