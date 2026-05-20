import { useState, useCallback, useEffect } from 'react';
import { commentsApi, Comment } from '@fresherflow/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queueComment, removeFromQueue, syncCommentQueue, getCommentQueue } from '../utils/commentQueue';
import { useAuthStore } from '@/store/useAuthStore';

export function useComments(opportunityId: string) {
    const { user } = useAuthStore();
    const isAnonymous = !user || user.isAnonymous;
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async (forceRefresh = false) => {
        if (!opportunityId) return;
        if (isAnonymous) {
            setComments([]);
            setLoading(false);
            return;
        }

        const CACHE_KEY = `ff_comments_cache_${opportunityId}`;
        const CACHE_TTL = 15 * 60 * 1000;

        try {
            let hasCachedData = false;
            let isCacheFresh = false;

            if (!forceRefresh) {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        setComments(parsed.data);
                        hasCachedData = true;
                        isCacheFresh = (Date.now() - parsed.timestamp < CACHE_TTL);
                        
                        // If the cache is fresh and we aren't forcing refresh, we can stop here
                        if (isCacheFresh) {
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('[useComments] Failed to parse comments cache:', e);
                    }
                }
            }

            // Only show a blocking loading spinner if we don't have any cached comments to show
            if (!hasCachedData) {
                setLoading(true);
            }

            const data = await commentsApi.list(opportunityId);
            
            // Merge with local queued comments for this opportunity
            const queue = await getCommentQueue();
            const localForThisJob = queue
                .filter(q => q.opportunityId === opportunityId)
                .map(q => ({
                    id: q.tempId,
                    text: q.text,
                    createdAt: new Date(q.timestamp).toISOString(),
                    user: { id: user?.id || 'me', username: user?.username || 'You' }
                } as Comment));

            const combined = [...localForThisJob, ...data];
            setComments(combined);
            
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                data: combined,
                timestamp: Date.now()
            }));
        } catch (err: unknown) {
            console.error('Failed to fetch comments:', err);
            setError((err as Error).message || 'Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [opportunityId, isAnonymous]);

    const postComment = useCallback(async (text: string) => {
        if (isAnonymous) return false;
        const tempId = `temp_${Date.now()}`;
        const mockComment: Comment = {
            id: tempId,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            user: {
                id: user?.id || 'me',
                username: user?.username || 'You'
            }
        };

        // 1. Optimistic Update
        setComments(prev => [mockComment, ...prev]);

        try {
            setPosting(true);
            const newComment = await commentsApi.post(opportunityId, text);
            
            // 2. Success: Replace temp with real
            setComments(prev => prev.map(c => c.id === tempId ? newComment : c));
            
            // 3. Sync cache
            const CACHE_KEY = `ff_comments_cache_${opportunityId}`;
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            const currentData = cached ? JSON.parse(cached).data : [];
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                data: [newComment, ...currentData.filter((c: Comment) => c.id !== tempId)],
                timestamp: Date.now()
            }));
            
            return true;
        } catch (err: unknown) {
            console.warn('[useComments] API failed, keeping comment in local queue:', (err as Error).message);
            
            // 4. Failure: Keep it local and queue for retry
            await queueComment(opportunityId, text);
            
            // Update UI to show it's queued
            setComments(prev => prev.map(c => 
                c.id === tempId 
                    ? { ...c, user: { ...c.user, username: user?.username || 'You' } } 
                    : c
            ));

            return true; // Return true because we handled it offline
        } finally {
            setPosting(false);
        }
    }, [opportunityId]);

    const deleteComment = useCallback(async (commentId: string) => {
        if (isAnonymous) return;
        try {
            if (!commentId.startsWith('temp_')) {
                await commentsApi.delete(opportunityId, commentId);
            } else {
                await removeFromQueue(commentId);
            }
            setComments(prev => prev.filter(c => c.id !== commentId));
            
            const CACHE_KEY = `ff_comments_cache_${opportunityId}`;
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                const filtered = parsed.data.filter((c: Comment) => c.id !== commentId);
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: filtered,
                    timestamp: Date.now()
                }));
            }
        } catch (err: unknown) {
            console.error('Failed to delete comment:', err);
            setComments(prev => prev.filter(c => c.id !== commentId));
        }
    }, [opportunityId]);

    useEffect(() => {
        if (isAnonymous) {
            setComments([]);
            setLoading(false);
            return;
        }
        void fetchComments();
        // Background sync on mount
        void syncCommentQueue().then(synced => {
            if (synced > 0) void fetchComments(true);
        });
    }, [fetchComments, isAnonymous]);

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

