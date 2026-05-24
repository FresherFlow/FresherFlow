import { getFirebaseDatabaseUrl } from '@/config/firebase';
import { ActionType } from '@fresherflow/types';

export interface FirebaseTrackerItem {
  status: ActionType;
  updatedAt: number;
}

export type FirebaseTrackerMap = Record<string, FirebaseTrackerItem>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = any;

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseTrackerDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

function trackerRef(userId: string) {
  return getDb()?.ref(`/users/${userId}/tracker`);
}

/**
 * Subscribes to the user's job tracker records in real-time.
 * Returns an unsubscribe callback.
 */
export function subscribeToFirebaseTracker(
  userId: string,
  onUpdate: (trackerMap: FirebaseTrackerMap) => void
): () => void {
  const ref = trackerRef(userId);
  if (!ref) {
    onUpdate({});
    return () => {};
  }

  let settled = false;
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      onUpdate({});
    }
  }, 5000);

  try {
    ref.on('value', (snapshot: AnyRef) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      const val = snapshot.val();
      onUpdate(val || {});
    });

    return () => {
      clearTimeout(timeout);
      ref.off('value');
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[firebaseTrackerDb] Failed to subscribe to tracker:', error);
    return () => {};
  }
}

/**
 * Adds or updates a job status in the Firebase RTDB tracker.
 */
export async function writeFirebaseTrackerItem(
  userId: string,
  opportunityId: string,
  status: ActionType
): Promise<void> {
  try {
    const ref = trackerRef(userId)?.child(opportunityId);
    if (!ref) return;

    const payload: FirebaseTrackerItem = {
      status,
      updatedAt: Date.now(),
    };

    const writePromise = ref.set(payload);
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('RTDB write timeout')), 5000);
    });

    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[firebaseTrackerDb] Failed to write tracker item:', error);
  }
}

/**
 * Removes a job from the Firebase RTDB tracker.
 */
export async function removeFirebaseTrackerItem(
  userId: string,
  opportunityId: string
): Promise<void> {
  try {
    const ref = trackerRef(userId)?.child(opportunityId);
    if (!ref) return;

    const removePromise = ref.remove();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('RTDB remove timeout')), 5000);
    });

    await Promise.race([removePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[firebaseTrackerDb] Failed to remove tracker item:', error);
  }
}
