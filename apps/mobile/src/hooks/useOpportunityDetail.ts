import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';
import { Opportunity, OpportunityType, ActionType } from '@fresherflow/types';
import { opportunitiesApi, opportunityClicksApi, actionsApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useNotifications, useSaved } from '@repo/frontend-core';
import { readDetailCache, saveDetailCache, readSimilarCache, saveSimilarCache, readFeedCache } from '@/utils/offlineCache';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { MOBILE_SITE_URL } from '@/config/runtime';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

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
    const { isSaved, toggleSave } = useSaved();
    const { user } = useAuth();
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
                    matchScore: match.score,
                    matchReason: match.reason,
                    isEligible: match.isEligible
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

                // Fallback to API only if local results are insufficient
                const data = await opportunitiesApi.getSimilar(opportunityId) as { opportunities: Opportunity[] };
                if (cancelled) return;
                const results = data.opportunities || [];
                setSimilarOpportunities(results);
                void saveSimilarCache(opportunityId, results);
            } catch (err) {
                console.warn('Local/API similarity failed', err);
                if (cached && !cancelled) setSimilarOpportunities(cached.opportunities);
            }
        };

        void loadOpportunity();
        void loadSimilar();
        return () => { cancelled = true; };
    }, [opportunityId, showToast]);

    const handleShare = useCallback(async () => {
        if (!opportunity) return;
        try {
            const shareUrl = `${MOBILE_SITE_URL}${getPublicOpportunityPath(opportunity)}`;
            const result = await Share.share({
                message: `Check out this opportunity: ${opportunity.title} at ${opportunity.company}\n\nView details: ${shareUrl}${opportunity.applyLink ? `\nApply here: ${opportunity.applyLink}` : ''}`,
                url: shareUrl,
            });

            if (result.action === Share.sharedAction && user) {
                void actionsApi.track(opportunity.id, ActionType.SHARED);
            }
        } catch (shareError) {
            console.error('Error sharing opportunity', shareError);
        }
    }, [opportunity, user]);

    const handleApply = useCallback(async () => {
        if (!opportunity?.applyLink) {
            Alert.alert('Apply link unavailable', 'This opportunity does not have an application link yet.');
            return;
        }
        try {
            await opportunityClicksApi.trackApplyClick(opportunity.id, 'mobile_app');
        } catch (trackError) {
            console.warn('Failed to track application action', trackError);
        }
        try {
            await Linking.openURL(opportunity.applyLink);
        } catch {
            Alert.alert('Could not open link', 'Please try again later.');
        }
    }, [opportunity, user, navigation]);

    return {
        opportunity,
        loading,
        error,
        eligibilityReason,
        isSaved,
        toggleSave,
        handleShare,
        handleApply,
        similarOpportunities,
    };
};
