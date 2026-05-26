import { useState, useCallback, useEffect } from 'react';
import { actionsApi, profileApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useSaved } from '@repo/frontend-core';
import { Profile } from '@fresherflow/types';
import { saveLocalProfile, getLocalProfile } from '@/utils/localProfile';
import { enqueueProfileSync } from '@/utils/onboardingState';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { readFirebaseProfile, writeFirebaseProfile } from '@/utils/firebaseProfileDb';


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
    const { user, logout, firebaseUser } = useAuthStore();
    const firebaseUid = firebaseUser?.uid;  // Firebase UID for RTDB — different from user.id (Neon UUID)

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

        // 1. If stats were fetched in the last 5 minutes, serve from cache
        if (Date.now() - lastStatsFetchTime < 300000) {
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

        // 1. Serve from memory cache if fresh
        if (Date.now() - lastProfileFetchTime < 10000 && cachedProfile) {
            updateGlobalProfile(cachedProfile);
            updateGlobalPercentage(cachedCompletionPercentage);
            return;
        }

        // 2. Deduplicate simultaneous requests
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
            // 3. Try Firebase RTDB first — fast, no cold start
            const firebaseProfile = firebaseUid ? await readFirebaseProfile(firebaseUid) : null;

            if (firebaseProfile) {
                const completionPercentage = calculateProfileCompletion(firebaseProfile).percentage;
                return { profile: firebaseProfile, completionPercentage, source: 'firebase' };
            }

            // 4. Fallback to API if Firebase has nothing (first login, new user)
            const profileRes = await profileApi.get() as { profile: Profile };
            const completionPercentage = calculateProfileCompletion(profileRes.profile).percentage;
            return { profile: profileRes.profile, completionPercentage, source: 'api' };
        })();

        try {
            const res = await activeProfilePromise;
            lastProfileFetchTime = Date.now();
            updateGlobalProfile(res.profile);
            updateGlobalPercentage(res.completionPercentage);
            await saveLocalProfile(res.profile, user.id);
            console.log(`[useProfile] Profile loaded from ${res.source}`);
        } catch (e) {
            console.warn('[useProfile] Failed to fetch profile', e);
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
        // 1. Local-first: update in-memory and persist immediately
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        updateGlobalPercentage(calculateProfileCompletion(merged).percentage);
        await saveLocalProfile(merged, user?.id);

        if (isAnonymous) return;

        // 2. Write to Firebase RTDB (primary fast store) — fire-and-forget
        if (firebaseUid) void writeFirebaseProfile(firebaseUid, merged);


        // 3. Background sync to API (Neon DB for backend matching)
        try {
            await profileApi.updateEducation(data);
            lastProfileFetchTime = 0;
        } catch (e) {
            console.warn('[useProfile] Education API sync failed, queued for retry', e);
            if (user?.id) enqueueProfileSync(user.id, 'education', data);
        }
    }, [fullProfile, isAnonymous, user?.id]);


    const updatePreferences = useCallback(async (data: {
        interestedIn: string[];
        preferredCities: string[];
        workModes: string[];
    }) => {
        // 1. Local-first
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        updateGlobalPercentage(calculateProfileCompletion(merged).percentage);
        await saveLocalProfile(merged, user?.id);

        if (isAnonymous) return;

        // 2. Write to Firebase RTDB — fire-and-forget
        if (firebaseUid) void writeFirebaseProfile(firebaseUid, merged);

        // 3. Background sync to API
        try {
            await profileApi.updatePreferences(data);
            lastProfileFetchTime = 0;
        } catch (e) {
            console.warn('[useProfile] Preferences API sync failed, queued for retry', e);
            if (user?.id) enqueueProfileSync(user.id, 'preferences', data);
        }
    }, [fullProfile, isAnonymous, user?.id]);


    const updateReadiness = useCallback(async (data: { availability: string; skills: string[] }) => {
        // 1. Local-first
        const merged = { ...(fullProfile || {} as Profile), ...data } as Profile;
        updateGlobalProfile(merged);
        updateGlobalPercentage(calculateProfileCompletion(merged).percentage);
        await saveLocalProfile(merged, user?.id);

        if (isAnonymous) return;

        // 2. Write to Firebase RTDB — fire-and-forget
        if (firebaseUid) void writeFirebaseProfile(firebaseUid, merged);

        // 3. Background sync to API
        try {
            await profileApi.updateReadiness(data);
            lastProfileFetchTime = 0;
        } catch (e) {
            console.warn('[useProfile] Readiness API sync failed, queued for retry', e);
            if (user?.id) enqueueProfileSync(user.id, 'readiness', data);
        }
    }, [fullProfile, isAnonymous, user?.id]);


    useEffect(() => {
        if (user && !user.isAnonymous) {
            void fetchProfile();
        }
    }, [user, fetchProfile]);


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
