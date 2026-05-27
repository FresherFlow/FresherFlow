import { Comment } from '@fresherflow/api-client';
import { getFirebaseDatabaseUrl } from '@/config/firebase';

type FirebaseCommentUser = {
  id: string;
  fullName?: string | null;
  username?: string | null;
};

type FirebaseComment = {
  text: string;
  createdAt: string;
  user: FirebaseCommentUser;
};

type CommentsSnapshotValue = Record<string, FirebaseComment>;

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[firebaseCommentsDb] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

/**
 * Posts a new comment to a specific opportunity in Firebase RTDB.
 */
export async function postFirebaseComment(
  jobId: string,
  text: string,
  user: { id: string; fullName?: string | null; username?: string | null }
): Promise<Comment | null> {
  const database = getDb();
  if (!database) return null;

  try {
    const commentsRef = database.ref(`/comments/${jobId}`);
    const newCommentRef = commentsRef.push();
    const commentId = newCommentRef.key;

    if (!commentId) throw new Error('Failed to generate key from Firebase push()');

    const commentData: FirebaseComment = {
      text: text.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        fullName: user.fullName || null,
        username: user.username || null,
      },
    };

    await newCommentRef.set(commentData);

    return {
      id: commentId,
      text: commentData.text,
      createdAt: commentData.createdAt,
      user: {
        id: commentData.user.id,
        fullName: commentData.user.fullName,
        username: commentData.user.username,
      },
    };
  } catch (error) {
    console.warn('[firebaseCommentsDb] Failed to post comment:', error);
    throw error;
  }
}

/**
 * Deletes a comment from a specific opportunity in Firebase RTDB.
 */
export async function deleteFirebaseComment(jobId: string, commentId: string): Promise<boolean> {
  const database = getDb();
  if (!database) return false;

  try {
    await database.ref(`/comments/${jobId}`).child(commentId).remove();
    return true;
  } catch (error) {
    console.warn('[firebaseCommentsDb] Failed to delete comment:', error);
    return false;
  }
}

/**
 * Subscribes to comments of a specific opportunity in real-time.
 * Returns an unsubscribe function.
 * Includes a 5-second timeout fallback — if Firebase doesn't respond,
 * the callback fires with an empty array so the UI never hangs.
 */
export function subscribeToFirebaseComments(
  jobId: string,
  onUpdate: (comments: Comment[]) => void
): () => void {
  const database = getDb();
  if (!database) return () => {};

  let settled = false;

  // Safety timeout — unblocks UI if Firebase is unreachable
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      onUpdate([]);
    }
  }, 5000);

  try {
    const ref = database.ref(`/comments/${jobId}`);

    ref.on('value', (snapshot: any) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      const val = snapshot.val() as CommentsSnapshotValue | null;
      if (!val) {
        onUpdate([]);
        return;
      }

      // Map object dictionary to array and sort chronologically (newest first)
      const comments: Comment[] = Object.entries(val).map(([id, item]) => ({
        id,
        text: item.text ?? '',
        createdAt: item.createdAt ?? new Date().toISOString(),
        user: {
          id: item.user?.id ?? 'unknown',
          fullName: item.user?.fullName ?? null,
          username: item.user?.username ?? 'Anonymous',
        },
      }));

      comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(comments);
    });

    return () => {
      clearTimeout(timeout);
      ref.off('value');
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[firebaseCommentsDb] Failed to subscribe to comments:', error);
    return () => {};
  }
}
