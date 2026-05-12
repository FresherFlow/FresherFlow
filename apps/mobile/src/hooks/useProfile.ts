import { useState, useCallback, useEffect } from 'react';
import { actionsApi, profileApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useSaved } from '@repo/frontend-core';
import { Profile } from '@fresherflow/types';
import { saveLocalProfile, getLocalProfile } from '@/utils/localProfile';

export const useProfile = () => {
    const { user, profile: authProfile, logout, refreshMe } = useAuth();
    const { savedJobs } = useSaved();
    
    const [fullProfile, setFullProfile] = useState<Profile | null>(null);
    const [loadingCache, setLoadingCache] = useState(true);

    // Load from cache on mount
    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await getLocalProfile();
                if (cached) setFullProfile(cached);
            } finally {
                setLoadingCache(false);
            }
        };
        void loadCache();
    }, []);
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [contributionStats, setContributionStats] = useState({ totalContributed: 0, totalPublished: 0, approvalRate: 0 });

    const fetchStats = useCallback(async () => {
        if (!user) return;
        try {
            const data = await actionsApi.summary() as { summary: { applied?: number } };
            setAppliedCount(data.summary.applied || 0);
            
            if (user) {
                const contrib = await profileApi.getContributions(1);
                setContributionStats(contrib.stats);
            }
        } catch (e) {
            console.warn('Failed to fetch user stats', e);
        }
    }, [user]);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setLoadingProfile(true);
        try {
            const [profileRes, completionRes] = await Promise.all([
                profileApi.get(),
                profileApi.getCompletion()
            ]) as [{ profile: Profile }, { completionPercentage: number }];
            
            setFullProfile(profileRes.profile);
            setCompletionPercentage(completionRes.completionPercentage);
            await saveLocalProfile(profileRes.profile);
        } catch (e) {
            console.warn('Failed to fetch profile data', e);
        } finally {
            setLoadingProfile(false);
        }
    }, [user]);

    const updateEducation = useCallback(async (data: {
        fullName?: string;
        educationLevel: string;
        tenthYear: number;
        twelfthYear: number;
        gradCourse: string;
        gradSpecialization: string;
        gradYear: number;
        pgCourse?: string;
        pgSpecialization?: string;
        pgYear?: number;
    }) => {
        // Always merge + save locally, even on first save (fullProfile may be null)
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        setFullProfile(merged);
        await saveLocalProfile(merged);
        // Background API sync — silent fail is fine, local save is source of truth
        try {
            await profileApi.updateEducation(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Education sync failed, local saved ok', e);
        }
    }, [fullProfile, fetchProfile, refreshMe]);

    const updatePreferences = useCallback(async (data: {
        interestedIn: string[];
        preferredCities: string[];
        workModes: string[];
    }) => {
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        setFullProfile(merged);
        await saveLocalProfile(merged);
        try {
            await profileApi.updatePreferences(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Preferences sync failed, local saved ok', e);
        }
    }, [fullProfile, fetchProfile, refreshMe]);

    const updateReadiness = useCallback(async (data: { availability: string; skills: string[] }) => {
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        setFullProfile(merged);
        await saveLocalProfile(merged);
        try {
            await profileApi.updateReadiness(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Readiness sync failed, local saved ok', e);
        }
    }, [fullProfile, fetchProfile, refreshMe]);

    useEffect(() => {
        if (user) {
            void fetchStats();
            void fetchProfile();
        }
    }, [user, fetchStats, fetchProfile]);

    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);

    return {
        user,
        // fullProfile is local AsyncStorage data — source of truth for local-first testing
        // Falls back to authProfile only if local cache is empty
        profile: fullProfile ?? authProfile,
        completionPercentage,
        loadingProfile,
        loadingCache,
        savedJobs,
        appliedCount,
        contributionStats,
        handleLogout,
        fetchStats,
        fetchProfile,
        refreshMe,
        updateEducation,
        updatePreferences,
        updateReadiness,
    };
};
