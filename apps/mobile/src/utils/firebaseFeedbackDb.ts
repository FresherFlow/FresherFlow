import { getFirebaseDatabaseUrl } from '@/config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseFeedbackDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
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
