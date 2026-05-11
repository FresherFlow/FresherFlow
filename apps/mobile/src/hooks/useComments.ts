import { useState, useCallback, useEffect } from 'react';
import { commentsApi, Comment } from '@fresherflow/api-client';

export function useComments(opportunityId: string) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await commentsApi.list(opportunityId);
            setComments(data);
        } catch (err: unknown) {
            console.error('Failed to fetch comments:', err);
            setError((err as Error).message || 'Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [opportunityId]);

    const postComment = useCallback(async (text: string) => {
        try {
            setPosting(true);
            const newComment = await commentsApi.post(opportunityId, text);
            setComments(prev => [newComment, ...prev]);
            return true;
        } catch (err: unknown) {
            console.error('Failed to post comment:', err);
            throw err;
        } finally {
            setPosting(false);
        }
    }, [opportunityId]);

    const deleteComment = useCallback(async (commentId: string) => {
        try {
            await commentsApi.delete(opportunityId, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err: unknown) {
            console.error('Failed to delete comment:', err);
            throw err;
        }
    }, [opportunityId]);

    useEffect(() => {
        void fetchComments();
    }, [fetchComments]);

    return {
        comments,
        loading,
        posting,
        error,
        postComment,
        deleteComment,
        refresh: fetchComments,
    };
}
