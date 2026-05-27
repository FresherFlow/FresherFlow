import { getFirebaseDatabaseUrl } from '@/config/firebase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = any;

type DatabaseInstance = {
  ref: (path: string) => AnyRef;
};

let databaseInstance: any;
let serverValue: any;

function getDb(): DatabaseInstance | null {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    const dbModule = require('@react-native-firebase/database');
    serverValue = dbModule.ServerValue || dbModule.default?.ServerValue;
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseViewsDb] Firebase Database unavailable:', error);
    databaseInstance = null;
    serverValue = null;
  }
  return databaseInstance;
}

function getIncrement(n: number): unknown {
  getDb(); // Ensure database and serverValue are loaded
  return serverValue?.increment(n) ?? n;
}

/**
 * Increments the view count for a specific job in Firebase RTDB.
 * Prevents multiple views from the same user if userId is provided.
 */
export async function incrementFirebaseJobView(jobId: string, userId?: string | null): Promise<void> {
  const database = getDb();
  if (!database) return;

  try {
    if (userId) {
      const userRef = database.ref(`/users/${userId}/interactions/${jobId}/viewed`);
      const snapshot = await userRef.once('value');
      if (snapshot.exists()) return; // Already viewed by this user
      
      await userRef.set(Date.now());
    }
    
    await database.ref(`/stats/${jobId}/views`).set(getIncrement(1));
  } catch (error) {
    console.warn('[firebaseViewsDb] Failed to increment job view:', error);
  }
}

/**
 * Increments the apply click count for a specific job in Firebase RTDB.
 * Prevents multiple applies from the same user if userId is provided.
 */
export async function incrementFirebaseJobClick(jobId: string, userId?: string | null): Promise<void> {
  const database = getDb();
  if (!database) return;

  try {
    if (userId) {
      const userRef = database.ref(`/users/${userId}/interactions/${jobId}/applied`);
      const snapshot = await userRef.once('value');
      if (snapshot.exists()) return; // Already applied by this user
      
      await userRef.set(Date.now());
    }

    await database.ref(`/stats/${jobId}/applied`).set(getIncrement(1));
  } catch (error) {
    console.warn('[firebaseViewsDb] Failed to increment job click:', error);
  }
}

/**
 * Subscribes to the real-time stats (views & applied) of a specific job.
 * Returns an unsubscribe function.
 */
export function subscribeToFirebaseJobStats(
  jobId: string,
  onUpdate: (stats: { views: number; applied: number }) => void
): () => void {
  const database = getDb();
  if (!database) return () => {};

  let settled = false;
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      onUpdate({ views: 0, applied: 0 });
    }
  }, 5000);

  try {
    const ref = database.ref(`/stats/${jobId}`);

    ref.on('value', (snapshot: AnyRef) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = snapshot.val() as any;
      const views = val?.views ?? 0;
      const applied = val?.applied ?? 0;
      onUpdate({ views, applied });
    });

    return () => {
      clearTimeout(timeout);
      ref.off('value');
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[firebaseViewsDb] Failed to subscribe to job stats:', error);
    return () => {};
  }
}

/**
 * Subscribes to global app stats (like total downloads and active users).
 * Returns an unsubscribe function.
 */
export function subscribeToGlobalStats(
  onUpdate: (stats: { downloads: number; activeUsers: number }) => void
): () => void {
  const database = getDb();
  if (!database) return () => {};

  let settled = false;
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      onUpdate({ downloads: 0, activeUsers: 0 });
    }
  }, 5000);

  try {
    const ref = database.ref('/stats/global');

    ref.on('value', (snapshot: AnyRef) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = snapshot.val() as any;
      const downloads = val?.downloads ?? 0;
      const activeUsers = val?.activeUsers ?? 0;
      onUpdate({ downloads, activeUsers });
    });

    return () => {
      clearTimeout(timeout);
      ref.off('value');
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[firebaseViewsDb] Failed to subscribe to global stats:', error);
    return () => {};
  }
}
