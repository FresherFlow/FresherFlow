type NativeFirebaseAppModule = {
  getApps?: () => unknown[];
  initializeApp?: (options?: Record<string, unknown>) => unknown;
};

function loadNativeFirebaseApp(): NativeFirebaseAppModule | null {
  try {
    // Native Firebase is bundled only in a dev client or Android/iOS build.
    // Expo Go can import this file, but it cannot load the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/app') as NativeFirebaseAppModule;
  } catch (error) {
    console.warn('[Firebase] Native Firebase app unavailable. Use Expo dev client or Android build.', error);
    return null;
  }
}

const nativeApp = loadNativeFirebaseApp();

if (nativeApp?.getApps && nativeApp?.initializeApp && nativeApp.getApps().length === 0) {
  void nativeApp.initializeApp();
}
