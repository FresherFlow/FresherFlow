import { useState, useCallback, useEffect } from 'react';
import { Comment } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import {
  postFirebaseComment,
  deleteFirebaseComment,
  subscribeToFirebaseComments,
} from '../utils/firebaseCommentsDb';

export function useComments(opportunityId: string) {
  const { user } = useAuthStore();
  const isAnonymous = !user || user.isAnonymous;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error] = useState<string | null>(null);

  const postComment = useCallback(
    async (text: string) => {
      if (isAnonymous || !user) return false;
      try {
        setPosting(true);
        const newComment = await postFirebaseComment(opportunityId, text, {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
        });
        return !!newComment;
      } catch (err: unknown) {
        console.error('[useComments] Failed to post comment to Firebase:', err);
        throw err;
      } finally {
        setPosting(false);
      }
    },
    [opportunityId, isAnonymous, user]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (isAnonymous) return;
      try {
        await deleteFirebaseComment(opportunityId, commentId);
      } catch (err: unknown) {
        console.error('[useComments] Failed to delete comment from Firebase:', err);
      }
    },
    [opportunityId, isAnonymous]
  );

  useEffect(() => {
    if (isAnonymous || !opportunityId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = false;

    // Safety timeout — if Firebase doesn't respond in 5s, unblock the UI
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = subscribeToFirebaseComments(opportunityId, (realtimeComments) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      setComments(realtimeComments);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [opportunityId, isAnonymous]);

  return {
    comments,
    loading,
    posting,
    error,
    postComment,
    deleteComment,
    refresh: () => {}, // No-op, data updates in real-time automatically
  };
}


