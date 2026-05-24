import type { FirebaseAuthTypes } from '@/config/firebase';
import { getFirebaseDatabaseUrl } from '@/config/firebase';

export interface FirebaseOnboardingRecord {
  username?: string | null;
  fullName?: string | null;
  skipUsernameSetup?: boolean;
  profileCompleted?: boolean;
  updatedAt?: number;
}

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseOnboardingDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

function onboardingRef(userId: string) {
  return getDb()?.ref(`/users/${userId}/onboarding`);
}

export async function readFirebaseOnboardingRecord(
  firebaseUser: FirebaseAuthTypes.User | null | undefined
): Promise<FirebaseOnboardingRecord | null> {
  if (!firebaseUser || firebaseUser.isAnonymous) return null;

  try {
    const snapshotPromise = onboardingRef(firebaseUser.uid)?.once('value');
    if (!snapshotPromise) return null;

    const timeoutPromise = new Promise<{ val: () => FirebaseOnboardingRecord | null }>((_, reject) => {
      setTimeout(() => reject(new Error('RTDB timeout')), 5000);
    });

    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    return snapshot?.val() || null;
  } catch (error) {
    console.warn('[firebaseOnboardingDb] Failed to read onboarding record:', error);
    return null;
  }
}

export async function writeFirebaseOnboardingRecord(
  firebaseUser: FirebaseAuthTypes.User | null | undefined,
  payload: FirebaseOnboardingRecord
) {
  if (!firebaseUser || firebaseUser.isAnonymous) return;

  try {
    const writePromise = onboardingRef(firebaseUser.uid)?.update({
      ...payload,
      updatedAt: Date.now(),
    });

    if (!writePromise) return;

    // Fire-and-forget with a silent timeout — don't block the caller
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('RTDB write timeout')), 5000)
    );

    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[firebaseOnboardingDb] Failed to write onboarding record:', error);
  }
}
