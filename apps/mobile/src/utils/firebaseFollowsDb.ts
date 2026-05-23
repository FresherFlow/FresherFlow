import { getFirebaseDatabaseUrl } from '@/config/firebase';

export interface FirebaseFollowsRecord {
  tags?: string[];
  companies?: string[];
  contributors?: string[];
  updatedAt?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = any;

type DatabaseModule = {
  default?: (databaseUrl?: string) => {
    ref: (path: string) => {
      once: (event: 'value') => Promise<{ val: () => FirebaseFollowsRecord | null }>;
      set: (value: FirebaseFollowsRecord) => Promise<void>;
      update: (value: Partial<FirebaseFollowsRecord>) => Promise<void>;
      on: (event: 'value', callback: (snapshot: { val: () => FirebaseFollowsRecord | null }) => void) => void;
      off: (event: 'value') => void;
    };
  };
};

let databaseModule: DatabaseModule | null | undefined;

function loadDatabaseModule(): DatabaseModule | null {
  if (databaseModule !== undefined) return databaseModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    databaseModule = require('@react-native-firebase/database') as DatabaseModule;
  } catch (error) {
    console.warn('[firebaseFollowsDb] Firebase Database unavailable:', error);
    databaseModule = null;
  }
  return databaseModule;
}

function followsRef(userId: string) {
  const database = loadDatabaseModule()?.default?.(getFirebaseDatabaseUrl());
  return database?.ref(`/users/${userId}/follows`);
}

/**
 * Reads the follows record from Firebase RTDB for a given userId.
 * Includes a 5-second safety timeout.
 */
export async function readFirebaseFollows(userId: string): Promise<FirebaseFollowsRecord | null> {
  try {
    const ref = followsRef(userId);
    if (!ref) return null;

    const snapshotPromise = ref.once('value');
    const timeoutPromise = new Promise<{ val: () => FirebaseFollowsRecord | null }>((_, reject) => {
      setTimeout(() => reject(new Error('RTDB timeout')), 5000);
    });

    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    return snapshot?.val() || null;
  } catch (error) {
    console.warn('[firebaseFollowsDb] Failed to read follows record:', error);
    return null;
  }
}

/**
 * Writes the follows record to Firebase RTDB for a given userId.
 */
export async function writeFirebaseFollows(userId: string, record: FirebaseFollowsRecord): Promise<void> {
  try {
    const ref = followsRef(userId);
    if (!ref) return;

    const payload = {
      tags: record.tags || [],
      companies: record.companies || [],
      contributors: record.contributors || [],
      updatedAt: Date.now(),
    };

    const writePromise = ref.set(payload);
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('RTDB write timeout')), 5000);
    });

    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[firebaseFollowsDb] Failed to write follows record:', error);
  }
}

/**
 * Subscribes to changes on the user's follows record in real-time.
 * Returns an unsubscribe callback.
 */
export function subscribeToFirebaseFollows(
  userId: string,
  onUpdate: (record: FirebaseFollowsRecord) => void
): () => void {
  const ref = followsRef(userId);
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
    ref.on('value', (snapshot) => {
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
    console.warn('[firebaseFollowsDb] Failed to subscribe to follows:', error);
    return () => {};
  }
}
