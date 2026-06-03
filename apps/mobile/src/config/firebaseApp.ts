import firebaseApp from '@react-native-firebase/app';

type NativeFirebaseAppModule = {
  getApps?: () => unknown[];
  initializeApp?: (options?: Record<string, unknown>) => unknown;
};

function loadNativeFirebaseApp(): NativeFirebaseAppModule | null {
  try {
    // Statically imported to guarantee standard CJS/ESM interop under Hermes
    return firebaseApp as unknown as NativeFirebaseAppModule;
  } catch (error) {
    console.warn('[Firebase] Native Firebase app unavailable. Use Expo dev client or Android build.', error);
    return null;
  }
}

const nativeApp = loadNativeFirebaseApp();

const getApps = nativeApp && (typeof nativeApp === 'function' ? (nativeApp as any).getApps : nativeApp.getApps);
const initializeApp = nativeApp && (typeof nativeApp === 'function' ? (nativeApp as any).initializeApp : nativeApp.initializeApp);

if (getApps && initializeApp && getApps().length === 0) {
  void initializeApp();
}
