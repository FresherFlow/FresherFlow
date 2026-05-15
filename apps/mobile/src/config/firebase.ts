import './firebaseApp';
import { getAuth, FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Note: Initialization is handled automatically by @react-native-firebase/app 
// provided google-services.json (Android) and GoogleService-Info.plist (iOS) are present.

export const initializeAuth = () => {
  GoogleSignin.configure({
    webClientId: '436004959357-q5op58sloqgbcl7lv12frhn0gd2rc3k9.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

const auth = getAuth();

export { auth };
export type { FirebaseAuthTypes };
export default auth;
