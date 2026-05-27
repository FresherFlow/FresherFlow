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

/**
 * Fast network check to see if a user has already reported a job.
 * Uses a 3-second timeout to fail open (returns false) if offline.
 */
export async function checkFirebaseOpportunityReported(
  userId: string,
  jobId: string
): Promise<boolean> {
  try {
    const database = getDb();
    if (!database) return false;

    const ref = database.ref(`/users/${userId}/feedback/opportunities/${jobId}`);
    
    // Timeout so offline users don't hang
    const snapshot = await Promise.race([
      ref.once('value'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);

    if (!snapshot) return false;
    return snapshot.exists();
  } catch (error) {
    return false;
  }
}

/**
 * Subscribes to the user's feedback and report counts in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToUserFeedbackStats(
  userId: string,
  onUpdate: (stats: { feedbackCount: number; reportCount: number }) => void
): () => void {
  const database = getDb();
  if (!database) {
    onUpdate({ feedbackCount: 0, reportCount: 0 });
    return () => {};
  }

  let feedbackCount = 0;
  let reportCount = 0;

  const handleUpdate = () => {
    onUpdate({ feedbackCount, reportCount });
  };

  try {
    const globalRef = database.ref(`/users/${userId}/feedback/global`);
    const oppsRef = database.ref(`/users/${userId}/feedback/opportunities`);

    globalRef.on('value', (snapshot: any) => {
      const val = snapshot.val();
      feedbackCount = val ? Object.keys(val).length : 0;
      handleUpdate();
    });

    oppsRef.on('value', (snapshot: any) => {
      const val = snapshot.val();
      reportCount = val ? Object.keys(val).length : 0;
      handleUpdate();
    });

    return () => {
      globalRef.off('value');
      oppsRef.off('value');
    };
  } catch (error) {
    console.warn('[firebaseFeedbackDb] Failed to subscribe to user feedback stats:', error);
    onUpdate({ feedbackCount: 0, reportCount: 0 });
    return () => {};
  }
}
