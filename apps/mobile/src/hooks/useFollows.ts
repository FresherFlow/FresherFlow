import { useState, useCallback, useEffect } from 'react';
import { followsApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth } from '@repo/frontend-core';

interface Follows {
    tags: string[];
    companies: string[];
    contributors: string[];
}

export function useFollows() {
    const { user } = useAuth();
    const [follows, setFollows] = useState<Follows>({ tags: [], companies: [], contributors: [] });
    const [loading, setLoading] = useState(false);

    const fetchFollows = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await followsApi.get();
            setFollows(data);
        } catch (error) {
            console.error('Failed to fetch follows', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const follow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (!user) return;
        try {
            await followsApi.follow({ type, value });
            setFollows(prev => ({
                ...prev,
                [type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors']: 
                [...prev[type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors' as keyof Follows], value]
            }));
            return true;
        } catch (error) {
            console.error('Follow failed', error);
            return false;
        }
    }, [user]);

    const unfollow = useCallback(async (type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        if (!user) return;
        try {
            await followsApi.unfollow({ type, value });
            setFollows(prev => ({
                ...prev,
                [type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors']: 
                prev[type.toLowerCase() === 'tag' ? 'tags' : type.toLowerCase() === 'company' ? 'companies' : 'contributors' as keyof Follows].filter(v => v !== value)
            }));
            return true;
        } catch (error) {
            console.error('Unfollow failed', error);
            return false;
        }
    }, [user]);

    const isFollowing = useCallback((type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string) => {
        const list = type === 'TAG' ? follows.tags : type === 'COMPANY' ? follows.companies : follows.contributors;
        return list.includes(value);
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
