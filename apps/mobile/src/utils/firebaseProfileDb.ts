import { getFirebaseDatabaseUrl } from '@/config/firebase';
import { Profile } from '@fresherflow/types';

const RTDB_TIMEOUT_MS = 5000;

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseProfileDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

function profileRef(userId: string) {
  return getDb()?.ref(`/users/${userId}/careerProfile`);
}

/**
 * Read career profile from RTDB.
 * Fast — no Render cold start. Returns null if unavailable.
 */
export async function readFirebaseProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;

  try {
    const ref = profileRef(userId);
    if (!ref) return null;

    const snapshotPromise = ref.once('value');
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('RTDB read timeout')), RTDB_TIMEOUT_MS)
    );

    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    const val = snapshot?.val();
    return val ? (val as Profile) : null;
  } catch (error) {
    console.warn('[firebaseProfileDb] Failed to read profile:', error);
    return null;
  }
}

/**
 * Write career profile to RTDB.
 * Fire-and-forget — never blocks the caller.
 * Strips undefined values so RTDB doesn't error.
 */
export async function writeFirebaseProfile(userId: string, profile: Partial<Profile>): Promise<void> {
  if (!userId) return;

  try {
    const ref = profileRef(userId);
    if (!ref) return;

    // RTDB doesn't accept undefined values — strip them out
    const clean = JSON.parse(JSON.stringify({ ...profile, updatedAt: Date.now() }));

    const writePromise = ref.update(clean);
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('RTDB write timeout')), RTDB_TIMEOUT_MS)
    );

    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    // Silent — RTDB write failure must never block local save or API sync
    console.warn('[firebaseProfileDb] Failed to write profile:', error);
  }
}
