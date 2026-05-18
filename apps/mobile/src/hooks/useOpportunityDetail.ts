import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import { Opportunity, OpportunityType, ActionType, FeedbackReason } from '@fresherflow/types';
import { opportunitiesApi, opportunityClicksApi, actionsApi, feedbackApi } from '@fresherflow/api-client';
import { useNotifications, useSaved } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import { Analytics, EventNames } from '@/utils/analytics';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTracker } from '@/hooks/useTracker';
import { readDetailCache, saveDetailCache, readSimilarCache, saveSimilarCache, readFeedCache } from '@/utils/offlineCache';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { MOBILE_SITE_URL } from '@/config/runtime';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const getPublicOpportunityPath = (opportunity: Opportunity) => {
    const slugOrId = encodeURIComponent(opportunity.slug || opportunity.id);
    if (opportunity.type === OpportunityType.INTERNSHIP) return `/internships/${slugOrId}`;
    if (opportunity.type === OpportunityType.WALKIN) return `/walk-ins/details/${slugOrId}`;
    return `/jobs/${slugOrId}`;
};

export type ExtendedOpportunity = Opportunity & { matchScore?: number; matchReason?: string; isEligible?: boolean };

export const useOpportunityDetail = (
    opportunityId: string | null,
    initialOpportunity: ExtendedOpportunity | null,
    navigation: Props['navigation']
) => {
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { isTracking, getStatus, updateStatus, toggleTracking } = useTracker();
    const { user } = useAuthStore();
    const { showToast } = useNotifications();
    const [opportunity, setOpportunity] = useState<ExtendedOpportunity | null>(initialOpportunity);
    const [loading, setLoading] = useState(!opportunity);
    const [error, setError] = useState<string | null>(null);
    const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
    const [similarOpportunities, setSimilarOpportunities] = useState<Opportunity[]>([]);

    useEffect(() => {
        let cancelled = false;
        const loadOpportunity = async () => {
            if (!opportunityId) {
                setError('Opportunity details are unavailable.');
                setLoading(false);
                return;
            }
            if (!opportunity) setLoading(true);

            // Cache-First: If we have a version in cache, use it immediately
            // even if it's stale (>1 hour), especially if current opportunity is partial
            const cached = await readDetailCache(opportunityId);
            const CACHE_TTL = 60 * 60 * 1000; // 1 hour

            const isCurrentPartial = !opportunity?.description;
            const isCachedBetter = cached && !!cached.description && isCurrentPartial;

            if (cached) {
                const isFresh = cached._cachedAt && (Date.now() - cached._cachedAt < CACHE_TTL);
                const isComplete = !!cached.description;

                if (isCachedBetter || (isFresh && isComplete)) {
                    if (!cancelled) {
                        setOpportunity(cached as ExtendedOpportunity);
                        setLoading(false);
                        setError(null);
                    }

                    // If it's fresh enough AND complete, we can skip the API call
                    if (isFresh && isComplete) {
                        return;
                    }
                }
            }

            try {
                const data = await opportunitiesApi.getById(opportunityId) as { opportunity: Opportunity; isEligible?: boolean; eligibilityReason?: string };
                if (cancelled) return;

                const profile = await getLocalProfile();
                const match = calculateMatchScore(profile, data.opportunity);

                // Robust Check: If API returns partial data (e.g. unauthenticated) but we have a better cached version, use cache
                const hasFullData = !!data.opportunity.description;
                const cachedHasFullData = !!cached?.description;

                const fullOpportunity = {
                    ...(hasFullData ? data.opportunity : (cachedHasFullData ? cached : data.opportunity)),
                    matchScore: initialOpportunity?.matchScore ?? match.score,
                    matchReason: initialOpportunity?.matchReason ?? match.reason,
                    isEligible: initialOpportunity?.isEligible ?? match.isEligible
                };

                setOpportunity(fullOpportunity as ExtendedOpportunity);
                setEligibilityReason(!match.isEligible ? match.reason : null);
                setError(null);

                // Only save to cache if it's actually useful data
                if (hasFullData || !cachedHasFullData) {
                    await saveDetailCache(fullOpportunity as Opportunity);
                }

                // Track VIEW action
                if (user) {
                    void actionsApi.track(opportunityId, ActionType.VIEWED);
                }
            } catch (remoteError: unknown) {
                if (cancelled) return;
                if (cached) {
                    setOpportunity(cached);
                    setError(null);
                    showToast('Offline mode: showing cached details');
                } else {
                    const message = (remoteError as Error).message || 'Could not load opportunity';
                    setError(message);
                    showToast(message, 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const loadSimilar = async () => {
            if (!opportunityId) return;

            // Check specific similarity cache first
            const cached = await readSimilarCache(opportunityId);
            const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

            if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                if (!cancelled) setSimilarOpportunities(cached.opportunities);
                return;
            }

            try {
                // Client-side similarity logic: Use the broad feed cache as a pool
                const feedCache = await readFeedCache();
                const currentOpp = opportunity || initialOpportunity;

                if (feedCache && feedCache.items.length > 0 && currentOpp) {
                    const pool = feedCache.items;
                    const similar = pool
                        .filter((opp: Opportunity) => opp.id !== opportunityId)
                        .map((opp: Opportunity) => {
                            let score = 0;
                            // Match by company (high weight)
                            if (opp.company === currentOpp.company) score += 100;

                            // Match by type (Job vs Internship)
                            if (opp.type === currentOpp.type) score += 30;

                            // Match by Role/Function
                            if (opp.jobFunction && currentOpp.jobFunction && opp.jobFunction === currentOpp.jobFunction) score += 50;

                            // Match by skills overlap
                            const oppSkills = opp.requiredSkills || [];
                            const currentSkills = currentOpp.requiredSkills || [];
                            const commonSkills = oppSkills.filter((s: string) => currentSkills.includes(s));
                            score += commonSkills.length * 15;

                            // Match by location overlap
                            const oppLocs = opp.locations || [];
                            const currentLocs = currentOpp.locations || [];
                            const commonLocs = oppLocs.filter((l: string) => currentLocs.includes(l));
                            score += commonLocs.length * 20;

                            return { opp, score };
                        })
                        .filter((item: { score: number }) => item.score > 20) // Minimum threshold for relevance
                        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
                        .map((item: { opp: Opportunity }) => item.opp)
                        .slice(0, 8);

                    if (similar.length >= 3) {
                        if (!cancelled) {
                            setSimilarOpportunities(similar);
                            void saveSimilarCache(opportunityId, similar);
                            return;
                        }
                    }
                }

                // If we reach here, similarity was calculated from local pool and we have enough or all possible results
            } catch (err) {
                console.warn('Local similarity calculation failed', err);
                if (cached && !cancelled) setSimilarOpportunities(cached.opportunities);
            }
        };

        void loadOpportunity();
        void loadSimilar();
        return () => { cancelled = true; };
    }, [opportunityId, showToast]);

    const handleToggleSave = useCallback(async (opp: Opportunity) => {
        const wasSaved = isSaved(opp.id);
        toggleSave(opp);
        try {
            if (!wasSaved) {
                if (!isTracking(opp.id)) {
                    await toggleTracking(opp, ActionType.PLANNED);
                }
            } else {
                if (isTracking(opp.id)) {
                    await toggleTracking(opp);
                }
            }
        } catch (err) {
            console.warn('[OpportunityDetail] Failed to sync tracker with save action:', err);
        }
    }, [isSaved, toggleSave, isTracking, toggleTracking]);

    const handleShare = useCallback(async () => {
        if (!opportunity) return;
        try {
            const shareUrl = `${MOBILE_SITE_URL}${getPublicOpportunityPath(opportunity)}`;

            // Use expo-sharing for better native experience
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(shareUrl, {
                    dialogTitle: 'Share Opportunity',
                    mimeType: 'text/plain',
                    UTI: 'public.plain-text',
                });
            } else {
                // Fallback or handle appropriately
                console.log('Sharing not available');
            }

            if (user) {
                void actionsApi.track(opportunity.id, ActionType.SHARED);
            }
        } catch (shareError) {
            console.log('Share action failed', shareError);
        }
    }, [opportunity, user]);

    const handleReport = useCallback(async (reason: FeedbackReason) => {
        if (!opportunityId) return false;
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to report this opportunity.');
            return false;
        }

        try {
            await feedbackApi.submit(opportunityId, reason);
            if (user) {
                void actionsApi.track(opportunityId, ActionType.REPORTED);
            }
            return true;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Could not submit report';
            // Specific handling for already reported (P2002 translated by backend)
            if (msg.includes('already submitted')) {
                Alert.alert('Already Reported', 'You have already reported this opportunity.');
            } else {
                Alert.alert('Report Failed', msg);
            }
            return false;
        }
    }, [opportunityId, user]);

    const { openInAppWebView } = useSettingsStore();

    const handleApply = useCallback(async () => {
        if (!opportunity?.applyLink) {
            Alert.alert('Apply link unavailable', 'This opportunity does not have an application link yet.');
            return;
        }

        // Automatically add to tracker if not already there
        if (!isTracking(opportunity.id)) {
            void toggleTracking(opportunity);
        }

        try {
            await opportunityClicksApi.trackApplyClick(opportunity.id, 'mobile_app');
        } catch (trackError) {
            console.warn('Failed to track application action', trackError);
        }
        
        try {
            void actionsApi.track(opportunity.id, ActionType.APPLIED);
            Analytics.trackEvent(EventNames.JOB_APPLY_CLICKED, {
                opportunityId: opportunity.id,
                company: opportunity.company,
                useWebView: openInAppWebView
            });

            if (openInAppWebView) {
                Analytics.trackEvent(EventNames.WEBVIEW_OPENED, {
                    url: opportunity.applyLink,
                    opportunityId: opportunity.id
                });
                // BETA: Open in pure WebView
                navigation.navigate('JobWebView', { 
                    url: opportunity.applyLink, 
                    title: opportunity.title 
                });
            } else {
                // STANDARD: Open in OS in-app browser (Safe)
                await WebBrowser.openBrowserAsync(opportunity.applyLink, {
                    readerMode: false,
                    dismissButtonStyle: 'close',
                    toolbarColor: currentTheme.colors.background,
                    controlsColor: currentTheme.colors.primary,
                });
            }
            return true; // Indicate success for UI-side effects like StoreReview
        } catch (err) {
            console.error('Apply link opening failed:', err);
            Alert.alert('Could not open link', 'Please try again later.');
            return false;
        }
    }, [opportunity, isTracking, toggleTracking, openInAppWebView, navigation]);

    return {
        opportunity,
        loading,
        error,
        eligibilityReason,
        isSaved,
        toggleSave: handleToggleSave,
        isTracking,
        getStatus,
        updateStatus,
        toggleTracking,
        handleShare,
        handleApply,
        handleReport,
        similarOpportunities,
    };
};
