import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { getJSON, setJSON } from '@/utils/storage';
import { subscribeToFirebaseFollows, writeFirebaseFollows } from '@/utils/firebaseFollowsDb';

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

    const isAnonymous = !user || user.isAnonymous;

    // Real-time synchronization with Firebase RTDB
    useEffect(() => {
        if (isAnonymous || !user?.id) {
            setFollows({ tags: [], companies: [], contributors: [] });
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToFirebaseFollows(user.id, (record) => {
            const sanitized: Follows = {
                tags: record.tags || [],
                companies: record.companies || [],
                contributors: record.contributors || [],
            };
            setFollows(sanitized);
            setJSON(FOLLOWS_CACHE_KEY, sanitized);
            setLoading(false);
        });

        return unsubscribe;
    }, [isAnonymous, user?.id]);

    const follow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (isAnonymous || !user?.id) return false;
        
        const key = type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors';
        
        let updated = false;
        setFollows(prev => {
            const currentList = prev[key as keyof Follows] || [];
            if (currentList.includes(value)) return prev;
            
            const next = {
                ...prev,
                [key]: [...currentList, value]
            };
            setJSON(FOLLOWS_CACHE_KEY, next);
            
            // Fire-and-forget write to Firebase (native caching handles offline queuing)
            void writeFirebaseFollows(user.id, next);
            updated = true;
            return next;
        });

        return updated;
    }, [isAnonymous, user?.id]);

    const unfollow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (isAnonymous || !user?.id) return false;

        const key = type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors';
        
        let updated = false;
        setFollows(prev => {
            const currentList = prev[key as keyof Follows] || [];
            if (!currentList.includes(value)) return prev;
            
            const next = {
                ...prev,
                [key]: currentList.filter(v => v !== value)
            };
            setJSON(FOLLOWS_CACHE_KEY, next);
            
            // Fire-and-forget write to Firebase (native caching handles offline queuing)
            void writeFirebaseFollows(user.id, next);
            updated = true;
            return next;
        });

        return updated;
    }, [isAnonymous, user?.id]);

    const isFollowing = useCallback((type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        const list = type === 'TAG' ? follows.tags : type === 'COMPANY' ? follows.companies : follows.contributors;
        return Array.isArray(list) && list.includes(value);
    }, [follows]);

    const refresh = useCallback(async () => {
        // No-op because Firebase subscription synchronizes automatically in real-time
    }, []);

    return {
        follows,
        loading,
        follow,
        unfollow,
        isFollowing,
        refresh
    };
}

