import { getFirebaseDatabaseUrl } from '@/config/firebase';

type DatabaseModule = {
  default?: (databaseUrl?: string) => {
    ref: (path: string) => {
      push: () => {
        set: (value: any) => Promise<void>;
      };
      set: (value: any) => Promise<void>;
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
    console.warn('[firebaseFeedbackDb] Firebase Database unavailable:', error);
    databaseModule = null;
  }
  return databaseModule;
}

function getDb() {
  return loadDatabaseModule()?.default?.(getFirebaseDatabaseUrl()) ?? null;
}

/**
 * Submits global app feedback to Firebase RTDB under /users/{userId}/feedback/global
 */
export async function submitFirebaseAppFeedback(
  userId: string,
  payload: { type: string; rating: number; message: string }
): Promise<void> {
  try {
    const database = getDb();
    if (!database) return;

    const ref = database.ref(`/users/${userId}/feedback/global`).push();
    await ref.set({
      ...payload,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn('[firebaseFeedbackDb] Failed to submit app feedback to Firebase:', error);
  }
}

/**
 * Submits opportunity/job report feedback to Firebase RTDB under /users/{userId}/feedback/opportunities/{jobId}
 */
export async function submitFirebaseOpportunityFeedback(
  userId: string,
  jobId: string,
  reason: string
): Promise<void> {
  try {
    const database = getDb();
    if (!database) return;

    const ref = database.ref(`/users/${userId}/feedback/opportunities/${jobId}`);
    await ref.set({
      reason,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn('[firebaseFeedbackDb] Failed to submit opportunity feedback to Firebase:', error);
  }
}
