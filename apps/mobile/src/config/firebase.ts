import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

export const initializeAuth = () => {
  GoogleSignin.configure({
    webClientId: '346180935352-mr0jnrbqo9382vg987mb8ms4otfgmh1j.apps.googleusercontent.com',
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
