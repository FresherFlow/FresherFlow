import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionType, type Opportunity, type User } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { toastError } from '@repo/ui/utils/error-web';
import { getRecentViewedByIdOrSlug, saveRecentViewed } from '@/lib/api/offline/recentViewed';
import { analytics } from '@/lib/api/analytics';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { buildLoginFromDetailHref, getDetailShareUrl } from '@/features/opportunities/domain/opportunityDetailHelpers';
import { getRelatedOpportunities } from '@/features/opportunities/utils/detailUtils';
import { useFirebaseTracker } from '@/lib/hooks/useFirebaseTracker';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import { readFeedCache, saveOpportunityToCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { promptLoginToast } from '@/lib/utils/toastUtils';



export function useOpportunityDetail(
    id: string, 
    initialData?: Opportunity | null, 
    user?: User | null,
    initialRelatedData: Opportunity[] = [],
    allOpps: Opportunity[] = []
) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [opp, setOpp] = useState<Opportunity | null>(initialData || null);
    
    const [isLoading, setIsLoading] = useState<boolean>(!initialData);

    const [isUpdatingAction, setIsUpdatingAction] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const initialDataRef = useRef(initialData);
    useEffect(() => {
        initialDataRef.current = initialData;
    }, [initialData]);

    const hasTrackedDetailViewRef = useRef(false);
    const hasShownNotFoundRef = useRef(false);
    const hasAttemptedLoadRef = useRef(false);

    const { trackerMap, writeTrackerItem, removeTrackerItem } = useFirebaseTracker(user?.id);
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);

    const enrichedOpp = useMemo(() => {
        if (!opp) return null;
        const trackerItem = trackerMap[opp.id];
        const isSaved = !!savedJobsMap[opp.id];
        const oppWithActions = { ...opp, isSaved };

        if (trackerItem) {
            oppWithActions.actions = [
                {
                    id: `rtdb-${opp.id}`,
                    userId: user?.id || '',
                    opportunityId: opp.id,
                    actionType: trackerItem.status,
                    createdAt: new Date(trackerItem.updatedAt),
                }
            ];
        }
        return oppWithActions;
    }, [opp, trackerMap, savedJobsMap, user?.id]);

    const loadOpportunity = useCallback(async () => {
        if (initialDataRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
            // CDN-first single-source-of-truth detail resolver
            const { fetchBootstrapFeed, fetchExpiredFeed } = await import('@/lib/api/cdnFeed');
            const feed = await fetchBootstrapFeed();
            
            let opportunity = feed?.opportunities?.find(
                (opp) => opp.slug === id || opp.id === id
            );

            // Fallback: Check expired feed if not in active feed
            if (!opportunity) {
                const expiredFeed = await fetchExpiredFeed();
                opportunity = expiredFeed?.opportunities?.find(
                    (opp) => opp.slug === id || opp.id === id
                );
            }

            if (!opportunity) {
                // Fallback to recent viewed in case of offline / local cache
                const cachedOpportunity = getRecentViewedByIdOrSlug(id);
                if (cachedOpportunity) {
                    setOpp(cachedOpportunity);
                    toast.success('Offline mode: loaded cached listing.');
                    return;
                }
                throw new Error('Listing not found.');
            }

            const sanitized = {
                ...opportunity,
                locations: opportunity.locations || [],
                requiredSkills: opportunity.requiredSkills || [],
                allowedDegrees: opportunity.allowedDegrees || [],
                allowedPassoutYears: opportunity.allowedPassoutYears || []
            };
            setOpp({
                ...sanitized,
                isSaved: opportunity.isSaved || false
            });
            saveOpportunityToCache(sanitized as Opportunity);
            saveRecentViewed({
                ...sanitized,
                isSaved: opportunity.isSaved || false
            });
        } catch (err: unknown) {
            const errorMessage = (err as Error)?.message || 'Listing not found.';
            setError(errorMessage);

            // Don't show toast error for clean 404s (listing not found / no longer available)
            const isClean404 = errorMessage === 'Listing not found.' || errorMessage === 'Opportunity no longer available.';
            if (!hasShownNotFoundRef.current && !isClean404) {
                hasShownNotFoundRef.current = true;
                toastError(err, 'Listing not found.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const initialDataId = initialData?.id;
    useEffect(() => {
        if (initialData) {
            if (opp?.id !== initialData.id) {
                setOpp(initialData);
                setIsLoading(false);
                setError(null);
            }
            return;
        } 
        if (id) {
            setOpp(null);
            setIsLoading(true);
            setError(null);
            hasAttemptedLoadRef.current = true;
            
            const cached = getRecentViewedByIdOrSlug(id);
            if (cached) {
                setOpp(cached);
                setIsLoading(false);
            }
            
            void loadOpportunity();
        }
        hasTrackedDetailViewRef.current = false;
        hasShownNotFoundRef.current = false;
    }, [id, initialData, initialDataId, opp?.id, loadOpportunity]);

    useEffect(() => {
        if (opp) {
            saveRecentViewed(opp);
        }
    }, [opp]);

    useEffect(() => {
        if (opp && !hasTrackedDetailViewRef.current) {
            hasTrackedDetailViewRef.current = true;
            analytics.jobView(opp.id, opp.company, parseOpportunityLocation(opp.locations).shortLabel);
        }
    }, [opp]);

    const relatedOpps = useMemo(() => {
        if (initialRelatedData && initialRelatedData.length > 0) {
            return initialRelatedData;
        }
        if (!opp?.id) {
            return [];
        }
        if (allOpps && allOpps.length > 0) {
            return getRelatedOpportunities(opp, allOpps);
        }
        const cachedFeed = readFeedCache();
        if (cachedFeed?.opportunities && cachedFeed.opportunities.length > 0) {
            return getRelatedOpportunities(opp, cachedFeed.opportunities);
        }
        return [];
    }, [opp, allOpps, initialRelatedData]);

    const isLoadingRelated = false;

    const handleToggleSave = async () => {
        if (!opp) return;
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }

        try {
            await toggleSavedJob(opp.id);
            toast.success(savedJobsMap[opp.id] ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch (err: unknown) {
            toastError(err, 'Failed to update bookmark');
        }
    };

    const handleSetAction = async (actionType: ActionType) => {
        if (!opp) return;
        if (!user) {
            promptLoginToast('Sign in to update application status');
            return;
        }

        const currentAction = trackerMap[opp.id]?.status;
        const isTogglingOff = currentAction === actionType;

        setIsUpdatingAction(true);
        try {
            saveOpportunityToCache(opp);
            if (isTogglingOff) {
                await removeTrackerItem(opp.id);
                toast.success('Removed from tracker');
            } else {
                await writeTrackerItem(opp.id, actionType);
                toast.success('Progress updated');
            }
        } catch (err: unknown) {
            toastError(err, 'Could not update progress');
        } finally {
            setIsUpdatingAction(false);
        }
    };

    const handleApply = async () => {
        if (!opp) return;

        analytics.applyClick(opp.id, opp.company, !!opp.applyLink);
        const applyAction = opp.type === 'WALKIN' ? ActionType.PLANNED : ActionType.APPLIED;
        saveOpportunityToCache(opp);
        if (user) {
            writeTrackerItem(opp.id, applyAction).catch(() => undefined);
        }

        if (opp.applyLink) {
            window.open(opp.applyLink, '_blank', 'noopener,noreferrer');
        } else if (opp.companyWebsite) {
            window.open(opp.companyWebsite, '_blank', 'noopener,noreferrer');
        } else {
            toast.error('No application link available');
        }
    };

    const handleShare = async () => {
        const jobUrl = opp ? `${window.location.origin}${getOpportunityPathFromItem(opp)}` : window.location.href;
        const shareUrl = getDetailShareUrl(jobUrl);
        const shareData = {
            title: `${opp?.title} at ${opp?.company}`,
            text: `Check out this opportunity: ${opp?.title} at ${opp?.company}`,
            url: shareUrl,
        };

        // WEB PIVOT: no backend share tracking from public web.
        // growthApi.trackEvent('SHARE_JOB', 'opportunity_detail').catch(() => undefined);
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!');
            }
        } catch {
            // Share cancelled or not supported
        }
    };

    const handleCopyLink = async () => {
        try {
            const jobUrl = opp ? `${window.location.origin}${getOpportunityPathFromItem(opp)}` : window.location.href;
            await navigator.clipboard.writeText(getDetailShareUrl(jobUrl));
            toast.success('Link copied to clipboard!');
        } catch (err: unknown) {
            toastError(err, 'Failed to copy link');
        }
    };

    return {
        opp: enrichedOpp,
        setOpp,
        isLoading,
        error,
        relatedOpps,
        isLoadingRelated,
        isUpdatingAction,
        loadOpportunity,
        handleToggleSave,
        handleSetAction,
        handleApply,
        handleShare,
        handleCopyLink
    };
}
