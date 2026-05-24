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
