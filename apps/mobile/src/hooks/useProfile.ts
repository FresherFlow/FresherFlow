import { useState, useCallback, useEffect } from 'react';
import { actionsApi, profileApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useSaved } from '@repo/frontend-core';
import { Profile } from '@fresherflow/types';
import { saveLocalProfile, getLocalProfile } from '@/utils/localProfile';
import { enqueueProfileSync } from '@/utils/onboardingState';

// --- In-memory cache & request deduplication layer ---
let lastStatsFetchTime = 0;
let lastProfileFetchTime = 0;
let cachedAppliedCount = 0;
let cachedShareStats = { totalShared: 0, totalPublished: 0, approvalRate: 0 };
let cachedProfile: Profile | null = null;
let cachedCompletionPercentage = 0;

let activeStatsPromise: Promise<{ applied: number; shareStats: typeof cachedShareStats }> | null = null;
let activeProfilePromise: Promise<{ profile: Profile; completionPercentage: number }> | null = null;

// --- Global Subscription listeners to synchronize all mounted hook instances ---
const profileListeners = new Set<(profile: Profile | null) => void>();
const percentageListeners = new Set<(percentage: number) => void>();
const statsListeners = new Set<(stats: { applied: number; shareStats: typeof cachedShareStats }) => void>();

const updateGlobalProfile = (p: Profile | null) => {
    cachedProfile = p;
    profileListeners.forEach(listener => {
        try { listener(p); } catch (e) { console.error(e); }
    });
};

const updateGlobalPercentage = (pct: number) => {
    cachedCompletionPercentage = pct;
    percentageListeners.forEach(listener => {
        try { listener(pct); } catch (e) { console.error(e); }
    });
};

const updateGlobalStats = (stats: { applied: number; shareStats: typeof cachedShareStats }) => {
    cachedAppliedCount = stats.applied;
    cachedShareStats = stats.shareStats;
    statsListeners.forEach(listener => {
        try { listener(stats); } catch (e) { console.error(e); }
    });
};

export const useProfile = () => {
    const { user, logout } = useAuthStore();
    const refreshMe = async () => {}; // Placeholder to match previous interface
    const { savedJobs } = useSaved();

    const [fullProfile, setFullProfile] = useState<Profile | null>(null);
    const [loadingCache, setLoadingCache] = useState(true);

    // Subscribe to global updates
    useEffect(() => {
        profileListeners.add(setFullProfile);
        percentageListeners.add(setCompletionPercentage);
        
        const statsListener = (s: { applied: number; shareStats: typeof cachedShareStats }) => {
            setAppliedCount(s.applied);
            setShareStats(s.shareStats);
        };
        statsListeners.add(statsListener);

        return () => {
            profileListeners.delete(setFullProfile);
            percentageListeners.delete(setCompletionPercentage);
            statsListeners.delete(statsListener);
        };
    }, []);

    // Load from cache on mount
    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await getLocalProfile(user?.id);
                if (cached) {
                    updateGlobalProfile(cached);
                }
            } finally {
                setLoadingCache(false);
            }
        };
        void loadCache();
    }, [user?.id]);

    // Set initial values from memory cache if available
    useEffect(() => {
        if (cachedProfile) setFullProfile(cachedProfile);
        if (cachedCompletionPercentage) setCompletionPercentage(cachedCompletionPercentage);
        if (cachedAppliedCount) setAppliedCount(cachedAppliedCount);
        setShareStats(cachedShareStats);
    }, []);

    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [shareStats, setShareStats] = useState({ totalShared: 0, totalPublished: 0, approvalRate: 0 });

    const isAnonymous = !user || user.isAnonymous;

    const fetchStats = useCallback(async () => {
        if (!user || user.isAnonymous) return;

        // 1. If stats were fetched in the last 10 seconds, serve from cache
        if (Date.now() - lastStatsFetchTime < 10000) {
            updateGlobalStats({ applied: cachedAppliedCount, shareStats: cachedShareStats });
            return;
        }

        // 2. Deduplicate simultaneous active requests
        if (activeStatsPromise) {
            try {
                const res = await activeStatsPromise;
                updateGlobalStats(res);
            } catch {
                // Handled in main promise
            }
            return;
        }

        activeStatsPromise = (async () => {
            const data = await actionsApi.summary() as { summary: { applied?: number } };
            const applied = data.summary.applied || 0;

            let shareStatsVal = cachedShareStats;
            if (user) {
                const res = await profileApi.getShares(1);
                shareStatsVal = res.stats;
            }

            return { applied, shareStats: shareStatsVal };
        })();

        try {
            const res = await activeStatsPromise;
            lastStatsFetchTime = Date.now();
            updateGlobalStats(res);
        } catch (e) {
            console.warn('Failed to fetch user stats', e);
        } finally {
            activeStatsPromise = null;
        }
    }, [user]);

    const fetchProfile = useCallback(async () => {
        if (!user || user.isAnonymous) return;

        // 1. If profile was fetched in the last 10 seconds, serve from cache
        if (Date.now() - lastProfileFetchTime < 10000 && cachedProfile) {
            updateGlobalProfile(cachedProfile);
            updateGlobalPercentage(cachedCompletionPercentage);
            return;
        }

        // 2. Deduplicate simultaneous active requests
        if (activeProfilePromise) {
            try {
                const res = await activeProfilePromise;
                updateGlobalProfile(res.profile);
                updateGlobalPercentage(res.completionPercentage);
            } catch {
                // Handled in main promise
            }
            return;
        }

        setLoadingProfile(true);
        activeProfilePromise = (async () => {
            const [profileRes, completionRes] = await Promise.all([
                profileApi.get(),
                profileApi.getCompletion()
            ]) as [{ profile: Profile }, { completionPercentage: number }];

            return {
                profile: profileRes.profile,
                completionPercentage: completionRes.completionPercentage
            };
        })();

        try {
            const res = await activeProfilePromise;
            lastProfileFetchTime = Date.now();

            updateGlobalProfile(res.profile);
            updateGlobalPercentage(res.completionPercentage);
            await saveLocalProfile(res.profile, user.id);
        } catch (e) {
            console.warn('Failed to fetch profile data', e);
        } finally {
            setLoadingProfile(false);
            activeProfilePromise = null;
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
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        await saveLocalProfile(merged, user?.id);
        // Invalidate profile cache to force fresh reload
        lastProfileFetchTime = 0;
        if (isAnonymous) return;
        try {
            await profileApi.updateEducation(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Education sync failed, local saved ok', e);
            if (user?.id) enqueueProfileSync(user.id, 'education', data);
        }
    }, [fullProfile, fetchProfile, refreshMe, isAnonymous, user?.id]);

    const updatePreferences = useCallback(async (data: {
        interestedIn: string[];
        preferredCities: string[];
        workModes: string[];
    }) => {
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        await saveLocalProfile(merged, user?.id);
        // Invalidate profile cache
        lastProfileFetchTime = 0;
        if (isAnonymous) return;
        try {
            await profileApi.updatePreferences(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Preferences sync failed, local saved ok', e);
            if (user?.id) enqueueProfileSync(user.id, 'preferences', data);
        }
    }, [fullProfile, fetchProfile, refreshMe, isAnonymous, user?.id]);

    const updateReadiness = useCallback(async (data: { availability: string; skills: string[] }) => {
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        await saveLocalProfile(merged, user?.id);
        // Invalidate profile cache
        lastProfileFetchTime = 0;
        if (isAnonymous) return;
        try {
            await profileApi.updateReadiness(data);
            await Promise.all([fetchProfile(), refreshMe()]);
        } catch (e) {
            console.warn('[useProfile] Readiness sync failed, local saved ok', e);
            if (user?.id) enqueueProfileSync(user.id, 'readiness', data);
        }
    }, [fullProfile, fetchProfile, refreshMe, isAnonymous, user?.id]);

    useEffect(() => {
        if (user && !user.isAnonymous) {
            void fetchStats();
            void fetchProfile();
        }
    }, [user, fetchStats, fetchProfile]);

    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);

    return {
        user,
        profile: fullProfile ?? (user?.profile as Profile),
        completionPercentage,
        loadingProfile,
        loadingCache,
        savedJobs,
        appliedCount,
        shareStats,
        handleLogout,
        fetchStats,
        fetchProfile,
        refreshMe,
        updateEducation,
        updatePreferences,
        updateReadiness,
    };
};
