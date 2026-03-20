import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { opportunitiesApi, actionsApi, savedApi, growthApi, opportunityClicksApi } from '@/shared/api/client';
import { ActionType, type Opportunity, type User } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { toastError } from '@/shared/ui/error';
import { getRecentViewedByIdOrSlug, saveRecentViewed } from '@/shared/api/offline/recentViewed';
// removed unused sync status import
import { enqueueOfflineActionTrack, enqueueOfflineSaveToggle } from '@/shared/api/offline/actionQueue';
import { analytics } from '@/shared/api/analytics';
import { parseOpportunityLocation, getOpportunityPathFromItem } from '@fresherflow/domain';
import { buildLoginFromDetailHref, getDetailShareUrl } from '@fresherflow/domain';
import { getRelatedOpportunities } from '@fresherflow/domain';

export function useOpportunityDetail(id: string, initialData?: Opportunity | null, user?: User | null) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [opp, setOpp] = useState<Opportunity | null>(() => {
        if (initialData) return initialData;
        if (typeof window !== 'undefined') {
            const cached = getRecentViewedByIdOrSlug(id);
            if (cached) return cached;
        }
        return null;
    });
    
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (initialData) return false;
        if (typeof window !== 'undefined') {
            const cached = getRecentViewedByIdOrSlug(id);
            if (cached) return false;
        }
        return true;
    });

    const [relatedOpps, setRelatedOpps] = useState<Opportunity[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);
    const [isUpdatingAction, setIsUpdatingAction] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const hasTrackedDetailViewRef = useRef(false);
    const hasShownNotFoundRef = useRef(false);
    const hasAttemptedLoadRef = useRef(false);

    const loadOpportunity = useCallback(async () => {
        if (initialData) return;

        setIsLoading(true);
        setError(null);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const { opportunity } = await opportunitiesApi.getById(id) as { opportunity: Opportunity };
            clearTimeout(timeoutId);

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
            saveRecentViewed({
                ...sanitized,
                isSaved: opportunity.isSaved || false
            });
        } catch (err: unknown) {
            clearTimeout(timeoutId);
            
            const cachedOpportunity = getRecentViewedByIdOrSlug(id);
            if (cachedOpportunity) {
                setOpp(cachedOpportunity);
                toast.success('Offline mode: loaded cached listing.');
                return;
            }

            const isAbort = err instanceof Error && err.name === 'AbortError';
            const errorMessage = isAbort 
                ? 'Request timed out. Please check your connection.' 
                : (err as Error)?.message || 'Listing not found.';
            
            setError(errorMessage);

            if (!hasShownNotFoundRef.current) {
                hasShownNotFoundRef.current = true;
                if (!isAbort) {
                    toastError(err, 'Listing not found.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [id, initialData]);

    useEffect(() => {
        if (!initialData && id && !hasAttemptedLoadRef.current) {
            hasAttemptedLoadRef.current = true;
            void loadOpportunity();
        }
    }, [id, initialData, loadOpportunity]);

    useEffect(() => {
        if (opp) {
            saveRecentViewed(opp);
        }
    }, [opp]);

    useEffect(() => {
        if (opp && !hasTrackedDetailViewRef.current) {
            hasTrackedDetailViewRef.current = true;
            analytics.jobView(opp.id, opp.company, parseOpportunityLocation(opp.locations).shortLabel);
            growthApi.trackEvent('DETAIL_VIEW', 'opportunity_detail', { opportunityId: opp.id }).catch(() => undefined);
        }
    }, [opp]);

    useEffect(() => {
        if (!opp || !user) return;

        const trackView = async () => {
            try {
                const currentAction = opp.actions?.[0]?.actionType;
                if (!currentAction || currentAction === ActionType.VIEWED) {
                    await actionsApi.track(opp.id, ActionType.VIEWED);
                }
            } catch {
                // Silently fail
            }
        };

        trackView();
    }, [opp, user]);

    useEffect(() => {
        if (!opp) return;

        const loadRelated = async () => {
            setIsLoadingRelated(true);
            try {
                const data = await opportunitiesApi.list({ type: opp.type }) as { opportunities: Opportunity[] };
                setRelatedOpps(getRelatedOpportunities(opp, data.opportunities || []));
            } catch {
                setRelatedOpps([]);
            } finally {
                setIsLoadingRelated(false);
            }
        };

        void loadRelated();
    }, [opp?.id, opp?.type, opp?.requiredSkills, opp?.locations, opp?.company, opp?.workMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggleSave = async () => {
        if (!opp) return;

        const previousSavedState = opp.isSaved;
        const newSavedState = !previousSavedState;
        setOpp(prev => prev ? { ...prev, isSaved: newSavedState } : null);

        if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
            enqueueOfflineSaveToggle(opp.id, user.id);
            toast.success('Saved update queued for sync.');
            return;
        }

        try {
            const result = await savedApi.toggle(opp.id) as { saved: boolean };
            if (result.saved !== newSavedState) {
                setOpp(prev => prev ? { ...prev, isSaved: result.saved } : null);
            }
            if (result.saved) {
                growthApi.trackEvent('SAVE_JOB', 'opportunity_detail').catch(() => undefined);
            }
        } catch (err: unknown) {
            if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
                enqueueOfflineSaveToggle(opp.id, user.id);
                toast.success('Saved update queued for sync.');
                return;
            }
            setOpp(prev => prev ? { ...prev, isSaved: previousSavedState } : null);
            toastError(err, 'Failed to update bookmark');
        }
    };

    const handleSetAction = async (actionType: ActionType) => {
        if (!opp) return;
        if (!user) {
            const path = getOpportunityPathFromItem(opp);
            const sp = searchParams.get('source');
            router.push(buildLoginFromDetailHref(path, sp, searchParams.get('ref')));
            return;
        }

        const previousActions = opp.actions;
        setOpp((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                actions: [
                    {
                        id: `local-${prev.id}`,
                        userId: user.id,
                        opportunityId: prev.id,
                        actionType,
                        createdAt: new Date(),
                    }
                ]
            };
        });

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            enqueueOfflineActionTrack(opp.id, actionType, user.id);
            return;
        }

        setIsUpdatingAction(true);
        try {
            await actionsApi.track(opp.id, actionType);
        } catch (err: unknown) {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                enqueueOfflineActionTrack(opp.id, actionType, user.id);
                return;
            }
            setOpp((prev) => {
                if (!prev) return prev;
                return { ...prev, actions: previousActions };
            });
            toastError(err, 'Could not update progress');
        } finally {
            setIsUpdatingAction(false);
        }
    };

    const handleApply = async () => {
        if (!opp) return;

        analytics.applyClick(opp.id, opp.company, !!opp.applyLink);
        const applyAction = opp.type === 'WALKIN' ? ActionType.PLANNED : ActionType.APPLIED;
        if (user) {
            actionsApi.track(opp.id, applyAction).catch(() => undefined);
        }
        growthApi.trackEvent('APPLY_CLICK', 'opportunity_detail').catch(() => undefined);
        opportunityClicksApi.trackApplyClick(
            opp.id,
            'opportunity_detail',
            opp.applyLink || opp.companyWebsite || null
        ).catch(() => undefined);

        if (opp.applyLink) {
            window.open(opp.applyLink, '_blank', 'noopener,noreferrer');
        } else if (opp.companyWebsite) {
            window.open(opp.companyWebsite, '_blank', 'noopener,noreferrer');
        } else {
            toast.error('No application link available');
        }
    };

    const handleShare = async () => {
        const shareUrl = getDetailShareUrl(window.location.href);
        const shareData = {
            title: `${opp?.title} at ${opp?.company}`,
            text: `Check out this opportunity: ${opp?.title} at ${opp?.company}`,
            url: shareUrl,
        };

        growthApi.trackEvent('SHARE_JOB', 'opportunity_detail').catch(() => undefined);
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!');
            }
        } catch {
            console.error('Share failed');
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getDetailShareUrl(window.location.href));
            toast.success('Link copied to clipboard!');
        } catch (err: unknown) {
            toastError(err, 'Failed to copy link');
        }
    };

    return {
        opp,
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
