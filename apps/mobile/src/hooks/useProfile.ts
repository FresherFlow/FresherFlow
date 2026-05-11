import { useState, useCallback, useEffect } from 'react';
import { actionsApi, profileApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useSaved } from '@repo/frontend-core';
import { Profile } from '@fresherflow/types';

export const useProfile = () => {
    const { user, profile: authProfile, logout, refreshMe } = useAuth();
    const { savedJobs } = useSaved();
    
    const [fullProfile, setFullProfile] = useState<Profile | null>(null);
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [contributionStats, setContributionStats] = useState({ totalContributed: 0, totalPublished: 0, approvalRate: 0 });

    const fetchStats = useCallback(async () => {
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
        } catch (e) {
            console.warn('Failed to fetch profile data', e);
        } finally {
            setLoadingProfile(false);
        }
    }, [user]);

    const updateEducation = useCallback(async (data: Parameters<typeof profileApi.updateEducation>[0]) => {
        await profileApi.updateEducation(data);
        await Promise.all([fetchProfile(), refreshMe()]);
    }, [fetchProfile, refreshMe]);

    const updatePreferences = useCallback(async (data: Parameters<typeof profileApi.updatePreferences>[0]) => {
        await profileApi.updatePreferences(data);
        await Promise.all([fetchProfile(), refreshMe()]);
    }, [fetchProfile, refreshMe]);

    const updateReadiness = useCallback(async (data: Parameters<typeof profileApi.updateReadiness>[0]) => {
        await profileApi.updateReadiness(data);
        await Promise.all([fetchProfile(), refreshMe()]);
    }, [fetchProfile, refreshMe]);

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
        profile: fullProfile || authProfile,
        completionPercentage,
        loadingProfile,
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
