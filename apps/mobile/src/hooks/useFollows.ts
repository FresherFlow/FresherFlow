import { useState, useCallback, useEffect } from 'react';
import { followsApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { getJSON, setJSON } from '@/utils/storage';
import { enqueueOfflineFollowAdd, enqueueOfflineFollowRemove } from '@repo/frontend-core';

interface Follows {
    tags: string[];
    companies: string[];
    contributors: string[];
}

const FOLLOWS_CACHE_KEY = 'fresherflow_follows_cache_v1';

const getCachedFollows = (): Follows => {
    try {
        const cached = getJSON<Follows>(FOLLOWS_CACHE_KEY);
        if (cached && (cached.tags || cached.companies || cached.contributors)) {
            return {
                tags: cached.tags || [],
                companies: cached.companies || [],
                contributors: cached.contributors || [],
            };
        }
    } catch {
        // ignore
    }
    return { tags: [], companies: [], contributors: [] };
};

export function useFollows() {
    const { user } = useAuthStore();
    const [follows, setFollows] = useState<Follows>(getCachedFollows);
    const [loading, setLoading] = useState(false);

    const fetchFollows = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await followsApi.get();
            const sanitized = {
                tags: data?.tags || [],
                companies: data?.companies || [],
                contributors: data?.contributors || [],
            };
            setFollows(sanitized);
            setJSON(FOLLOWS_CACHE_KEY, sanitized);
        } catch (error) {
            console.error('Failed to fetch follows', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const follow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (!user) return false;
        
        // Optimistic UI updates
        const updateState = () => {
            setFollows(prev => {
                const key = type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors';
                const currentList = prev[key as keyof Follows] || [];
                if (currentList.includes(value)) return prev;
                const next = {
                    ...prev,
                    [key]: [...currentList, value]
                };
                setJSON(FOLLOWS_CACHE_KEY, next);
                return next;
            });
        };

        try {
            // Apply optimistic UI state immediately to prevent lag
            updateState();
            await followsApi.follow({ type, value });
            return true;
        } catch (error) {
            const err = error as { name?: string; message?: string };
            const isOffline = err?.name === 'OfflineError' || err?.message?.toLowerCase().includes('offline') || err?.message?.toLowerCase().includes('network error');
            if (isOffline) {
                console.log('[Follows] Offline detected. Enqueueing follow action in offline queue...', { type, value });
                void enqueueOfflineFollowAdd(type, value, user.id);
                return true;
            }
            
            // Revert on real server failure
            console.error('Follow failed', error);
            if (user) void fetchFollows();
            return false;
        }
    }, [user, fetchFollows]);

    const unfollow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (!user) return false;

        const updateState = () => {
            setFollows(prev => {
                const key = type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors';
                const currentList = prev[key as keyof Follows] || [];
                if (!currentList.includes(value)) return prev;
                const next = {
                    ...prev,
                    [key]: currentList.filter(v => v !== value)
                };
                setJSON(FOLLOWS_CACHE_KEY, next);
                return next;
            });
        };

        try {
            updateState();
            await followsApi.unfollow({ type, value });
            return true;
        } catch (error) {
            const err = error as { name?: string; message?: string };
            const isOffline = err?.name === 'OfflineError' || err?.message?.toLowerCase().includes('offline') || err?.message?.toLowerCase().includes('network error');
            if (isOffline) {
                console.log('[Follows] Offline detected. Enqueueing unfollow action in offline queue...', { type, value });
                void enqueueOfflineFollowRemove(type, value, user.id);
                return true;
            }

            console.error('Unfollow failed', error);
            if (user) void fetchFollows();
            return false;
        }
    }, [user, fetchFollows]);

    const isFollowing = useCallback((type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        const list = type === 'TAG' ? follows.tags : type === 'COMPANY' ? follows.companies : follows.contributors;
        return Array.isArray(list) && list.includes(value);
    }, [follows]);

    useEffect(() => {
        if (user) fetchFollows();
    }, [user, fetchFollows]);

    return {
        follows,
        loading,
        follow,
        unfollow,
        isFollowing,
        refresh: fetchFollows
    };
}
