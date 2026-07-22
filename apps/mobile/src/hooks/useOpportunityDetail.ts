import { useCallback, useEffect, useState, useRef } from 'react';
import { Share } from 'react-native';
import { openExternalURL } from '@/utils/browser';
import { formatOpportunityShareText } from '@/utils/shareTargets';
import axios from 'axios';
import { Opportunity, OpportunityType, ActionType, FeedbackReason } from '@fresherflow/types';
import { /* opportunityClicksApi, */ actionsApi, feedbackApi, opportunitiesApi } from '@fresherflow/api-client';
import { useNotifications, useSaved, enqueueOfflineReport, enqueueOfflineClickTrack } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import { Analytics, EventNames } from '@/utils/analytics';
import { useTracker } from '@/hooks/useTracker';
import { readDetailCache, saveDetailCache, readSimilarCache, saveSimilarCache, readFeedCache, isJobReportedLocally, saveReportedJobLocally } from '@/utils/cache/offlineCache';
import { markJobAsSeen, isJobOpened, markJobAsOpened } from '@/utils/cache/seenJobs';
import { getLocalProfile } from '@/utils/cache/localProfile';
import { generateCdnSignature } from '@/utils/cdnSignature';
import { BOOTSTRAP_FEED_URL, EXPIRED_FEED_URL } from '@/config/api';
import { calculateOpportunityMatch } from '@fresherflow/domain';
import { MOBILE_SITE_URL } from '@/utils/runtime';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { incrementFirebaseJobView, incrementFirebaseJobClick, subscribeToFirebaseJobStats } from '@/utils/firebaseViewsDb';
import { submitFirebaseOpportunityFeedback, checkFirebaseOpportunityReported } from '@/utils/firebaseFeedbackDb';

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
    navigation: any
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
    const [checkingExpired, setCheckingExpired] = useState(false);

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
                let foundOpportunity: Opportunity | null = null;


                // 2. Fallback: Try resolving from local offline feed cache
                if (!foundOpportunity) {
                    const feedCache = await readFeedCache();
                    if (feedCache && feedCache.items.length > 0) {
                        foundOpportunity = feedCache.items.find(
                            (opp: Opportunity) => opp.id === opportunityId || opp.slug === opportunityId
                        ) || null;
                    }
                }

                // 3. Fallback: Fetch signed master bootstrap feed from CDN Pop
                if (!foundOpportunity) {
                    try {
                        const signatureParams = generateCdnSignature('/bootstrap-feed.min.json');
                        const signedUrl = `${BOOTSTRAP_FEED_URL}?t=${signatureParams.t}&sig=${signatureParams.sig}`;
                        const response = await axios.get(signedUrl, { 
                             timeout: 5000
                        });

                        if (response.data?.opportunities) {
                            const ops = response.data.opportunities as Opportunity[];
                            foundOpportunity = ops.find(
                                (opp: Opportunity) => opp.id === opportunityId || opp.slug === opportunityId
                            ) || null;
                        }
                    } catch (cdnErr) {
                        console.warn('[useOpportunityDetail] CDN fallback failed:', cdnErr);
                    }
                }

                // 3.5. Fallback: Fetch expired feed if missed from main feed
                if (!foundOpportunity) {
                    try {
                        if (!cancelled) setCheckingExpired(true);
                        const signatureParams = generateCdnSignature('/expired-feed.min.json');
                        const signedUrl = `${EXPIRED_FEED_URL}?t=${signatureParams.t}&sig=${signatureParams.sig}`;
                        const response = await axios.get(signedUrl, { 
                             timeout: 5000
                        });

                        if (response.data?.opportunities) {
                            const ops = response.data.opportunities as Opportunity[];
                            foundOpportunity = ops.find(
                                (opp: Opportunity) => opp.id === opportunityId || opp.slug === opportunityId
                            ) || null;
                        }
                    } catch (cdnErr) {
                        console.warn('[useOpportunityDetail] Expired CDN fallback failed:', cdnErr);
                    } finally {
                        if (!cancelled) setCheckingExpired(false);
                    }
                }

                // 4. Fail-safe fallback: let it throw if not resolved via local cache, CDN, or API
                if (!foundOpportunity) {
                    throw new Error('Opportunity details not found.');
                }

                if (cancelled) return;

                const profile = await getLocalProfile();
                const match = calculateOpportunityMatch(profile, foundOpportunity);
                // Robust Check: If API/CDN returns partial data but we have a better cached version, use cache
                const hasFullData = !!foundOpportunity.description;
                const cachedHasFullData = !!cached?.description;

                const baseOpp = hasFullData ? foundOpportunity : (cachedHasFullData ? cached : foundOpportunity);
                const fullOpportunity = {
                    ...baseOpp,
                    clicksCount: Math.max(
                        foundOpportunity?.clicksCount || 0,
                        baseOpp?.clicksCount || 0,
                        cached?.clicksCount || 0,
                        1
                    ),
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

                
                // Trigger similar load now that we have the object
                void loadSimilar(fullOpportunity as Opportunity);
            } catch (remoteError: unknown) {
                if (cancelled) return;
                if (cached) {
                    setOpportunity(cached);
                    setError(null);
                    showToast('Offline mode: showing cached details');
                    void loadSimilar(cached as Opportunity);
                } else {
                    const message = (remoteError as Error).message || 'Could not load opportunity';
                    setError(message);
                    showToast(message, 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const loadSimilar = async (currentOpp: Opportunity) => {
            if (!opportunityId || !currentOpp) return;

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

                if (feedCache && feedCache.items.length > 0) {
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
        return () => { cancelled = true; };
    }, [opportunityId, showToast]);

    const viewTrackedRef = useRef<string | null>(null);

    // Subscribe to real-time views and applied counts from Firebase RTDB
    useEffect(() => {
        if (!opportunityId) return;

        const unsubscribe = subscribeToFirebaseJobStats(opportunityId, (realtimeStats) => {
            setOpportunity(prev => {
                if (!prev) return null;
                
                // Prevent downward flickering (e.g. if Firebase initially returns null from local cache before network fetch)
                // Also preserves our optimistic local increment!
                const newViews = Math.max(prev.clicksCount || 0, realtimeStats.views);
                const newApplies = Math.max(prev.appliedCount || 0, realtimeStats.applied);

                if (prev.clicksCount === newViews && prev.appliedCount === newApplies) {
                    return prev;
                }

                return {
                    ...prev,
                    clicksCount: newViews,
                    appliedCount: newApplies
                };
            });
        });

        return unsubscribe;
    }, [opportunityId]);

    useEffect(() => {
        if (!opportunity || !opportunity.id || viewTrackedRef.current === opportunity.id) return;
        viewTrackedRef.current = opportunity.id;

        const recordView = async () => {
            try {
                const alreadyOpened = await isJobOpened(opportunity.id);
                if (!alreadyOpened) {
                    // 1. Increment clicksCount locally
                    const updatedOpp = {
                        ...opportunity,
                        clicksCount: (opportunity.clicksCount || 0) + 1
                    };
                    
                    // 2. Set the state
                    setOpportunity(updatedOpp);
                    
                    // 3. Save to cache ONLY if we have full data, to avoid overwriting rich cache with partial list-item
                    const isPartial = !opportunity?.description;
                    if (!isPartial) {
                        await saveDetailCache(updatedOpp as Opportunity);
                    }
                    
                    // 4. Mark job as opened and seen locally
                    await markJobAsOpened(opportunity.id);
                    await markJobAsSeen(opportunity.id);
                    
                    // 5. Track/Sync view count increment on Firebase RTDB
                    try {
                        if (!__DEV__) {
                            await incrementFirebaseJobView(opportunity.id, user?.id);
                        }
                    } catch (trackError: unknown) {
                        console.warn('[useOpportunityDetail] Failed to increment view in Firebase:', trackError);
                        // Fallback to local offline cache if Firebase fails (highly unlikely as Firebase has its own robust offline queueing)
                        await enqueueOfflineClickTrack(opportunity.id, 'detail_view', user?.id);
                    }
                }
            } catch (err) {
                console.error('[useOpportunityDetail] Failed to record view:', err);
            }
        };

        void recordView();
    }, [opportunity?.id, user?.id]);

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
            const formattedMessage = formatOpportunityShareText(opportunity, shareUrl);

            await Share.share({
                message: formattedMessage,
                url: shareUrl,
                title: `Share ${opportunity.title || 'Opportunity'}`,
            });

            if (user && !user.isAnonymous) {
                void actionsApi.track(opportunity.id, ActionType.SHARED);
            }
        } catch (shareError) {
            console.warn('[useOpportunityDetail] Share action failed:', shareError);
        }
    }, [opportunity, user]);

    const handleReport = useCallback(async (reason: FeedbackReason) => {
        if (!opportunityId) return false;
        if (!user || user.isAnonymous) {
            showToast('Please sign in to report this opportunity.', 'info');
            return false;
        }

        // 1. Local-first check
        if (isJobReportedLocally(opportunityId)) {
            showToast('You have already reported this opportunity', 'info');
            return false;
        }

        // 2. Fast Network Check (Firebase)
        const alreadyReported = await checkFirebaseOpportunityReported(user.id, opportunityId);
        if (alreadyReported) {
             saveReportedJobLocally(opportunityId);
             showToast('You have already reported this opportunity', 'info');
             return false;
        }

        // 3. Submit to Firebase RTDB instantly (non-blocking)
        void submitFirebaseOpportunityFeedback(user.id, opportunityId, reason);

        // 4. Mark locally instantly to prevent double-submitting
        saveReportedJobLocally(opportunityId);

        // 4. Fire-and-forget backend sync in background for Telegram & Admin panel
        void feedbackApi.submit(opportunityId, reason)
            .then(() => {
                void actionsApi.track(opportunityId, ActionType.REPORTED);
            })
            .catch(async (err: unknown) => {
                const errorObj = err as { name?: string; message?: string; status?: number };
                const isOffline = errorObj?.name === 'OfflineError' || 
                                  errorObj?.message?.toLowerCase().includes('offline') || 
                                  errorObj?.message?.toLowerCase().includes('network error') ||
                                  errorObj?.message?.toLowerCase().includes('timeout') ||
                                  (errorObj?.status && errorObj.status >= 500);

                if (isOffline) {
                    // API is offline or sleeping - queue offline as backup
                    await enqueueOfflineReport(opportunityId, reason, undefined, user.id);
                }
            });

        // 5. Instantly notify success
        showToast('Opportunity reported. Thank you for helping the community!', 'success');
        return true;
    }, [opportunityId, user, showToast]);

    const handleApply = useCallback(async () => {
        if (!opportunity?.applyLink) {
            showToast('This opportunity does not have an application link yet.', 'info');
            return;
        }

        // Clean and validate link scheme defensively
        let applyUrl = opportunity.applyLink.trim();
        if (!/^https?:\/\//i.test(applyUrl)) {
            applyUrl = `https://${applyUrl}`;
        }

        // Automatically add to tracker if not already there
        if (!isTracking(opportunity.id)) {
            void toggleTracking(opportunity);
        }

        if (user && !user.isAnonymous) {
            // Fire-and-forget: Do not await network calls so the button action remains responsive offline
            void incrementFirebaseJobClick(opportunity.id, user.id).catch(trackError => {
                console.warn('Failed to track application action in Firebase', trackError);
            });
        }
        
        try {
            if (user && !user.isAnonymous) {
                void actionsApi.track(opportunity.id, ActionType.APPLIED);
            }
            Analytics.trackEvent(EventNames.JOB_APPLY_CLICKED, {
                opportunityId: opportunity.id,
                company: opportunity.company,
                useWebView: false
            });

            // STANDARD: Open in OS in-app browser (Safe) or external browser according to setting
            await openExternalURL(applyUrl, currentTheme.colors);
            return true; // Indicate success for UI-side effects like StoreReview
        } catch (err) {
            console.error('Apply link opening failed:', err);
            showToast('Could not open link. Please try again later.', 'error');
            return false;
        }
    }, [opportunity, isTracking, toggleTracking, navigation, user, currentTheme.id]);

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
        checkingExpired,
    };
};
