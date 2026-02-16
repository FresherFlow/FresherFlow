'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { opportunitiesApi, actionsApi, feedbackApi, savedApi, growthApi, opportunityClicksApi } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { ActionType, type Opportunity } from '@fresherflow/types';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import FlagIcon from '@heroicons/react/24/outline/FlagIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { getRecentViewedByIdOrSlug, saveRecentViewed } from '@/lib/offline/recentViewed';
import { formatSyncTime, getDetailLastSyncAt } from '@/lib/offline/syncStatus';
import { enqueueOfflineActionTrack, enqueueOfflineSaveToggle } from '@/lib/offline/actionQueue';
import { OpportunityDetailSkeleton } from '@/components/ui/Skeleton';
import { buildShareUrl } from '@/lib/share';
import { sanitizeHtml } from '@/lib/sanitize';
import { analytics } from '@/lib/analytics';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import { OpportunityDeadlineBadge } from './components/OpportunityDeadlineBadge';
import { EligibilitySnapshotCard } from './components/EligibilitySnapshotCard';

export default function OpportunityDetailClient({ id, initialData }: { id: string; initialData?: Opportunity | null }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    // Use initialData if available, otherwise start null
    const [opp, setOpp] = useState<Opportunity | null>(initialData || null);
    // If initialData is provided, we are not loading. If not provided, we are loading.
    const [isLoading, setIsLoading] = useState(!initialData);
    const [showReports, setShowReports] = useState(false);
    const reportMenuRef = useRef<HTMLDivElement | null>(null);
    const hasTrackedDetailViewRef = useRef(false);
    const hasShownNotFoundRef = useRef(false);
    const hasAttemptedLoadRef = useRef(false);
    const [isOnline, setIsOnline] = useState(true);
    const [detailLastSyncAt, setDetailLastSyncAt] = useState<number | null>(null);
    const [relatedOpps, setRelatedOpps] = useState<Opportunity[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);
    const [isUpdatingAction, setIsUpdatingAction] = useState(false);

    const loadOpportunity = useCallback(async () => {
        if (initialData) return;

        setIsLoading(true);
        try {
            const { opportunity } = await opportunitiesApi.getById(id) as { opportunity: Opportunity };
            // Sanitize data
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
            setDetailLastSyncAt(getDetailLastSyncAt());
        } catch {
            const cachedOpportunity = getRecentViewedByIdOrSlug(id);
            if (cachedOpportunity) {
                setOpp(cachedOpportunity);
                toast.success('Offline mode: loaded cached listing.');
                return;
            }
            if (!hasShownNotFoundRef.current) {
                hasShownNotFoundRef.current = true;
                toastError(new Error('Listing not found.'));
            }
            router.push('/opportunities');
        } finally {
            setIsLoading(false);
        }
    }, [id, router, initialData]);

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
        if (typeof window === 'undefined') return;
        setIsOnline(window.navigator.onLine);
        setDetailLastSyncAt(getDetailLastSyncAt());

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (opp && !hasTrackedDetailViewRef.current) {
            hasTrackedDetailViewRef.current = true;
            // Track job view in analytics
            analytics.jobView(opp.id, opp.company, opp.locations?.[0] || 'Remote');
        }
    }, [opp]);

    // Auto-track VIEWED action for logged-in users (background, non-blocking)
    useEffect(() => {
        if (!opp || !user) return;

        // Fire-and-forget: track view in background
        const trackView = async () => {
            try {
                // Only track if no stronger action exists
                const currentAction = opp.actions?.[0]?.actionType;
                if (!currentAction || currentAction === ActionType.VIEWED) {
                    await actionsApi.track(opp.id, ActionType.VIEWED);
                }
            } catch {
                // Silently fail - don't block user experience
            }
        };

        trackView();
    }, [opp, user]);

    useEffect(() => {
        if (!opp) return;

        const loadRelated = async () => {
            if (!opp) return;
            setIsLoadingRelated(true);
            try {
                const data = await opportunitiesApi.list({ type: opp.type }) as { opportunities: Opportunity[] };
                const currentSkillSet = new Set((opp.requiredSkills || []).map((s) => s.toLowerCase()));
                const currentLocations = new Set((opp.locations || []).map((l) => l.toLowerCase()));

                const scored = (data.opportunities || [])
                    .filter((item: Opportunity) => item.id !== opp.id)
                    .filter((item: Opportunity) => !item.expiresAt || new Date(item.expiresAt) > new Date())
                    .map((item: Opportunity) => {
                        let score = 0;
                        if (item.company === opp.company) score += 5;

                        const itemLocations = (item.locations || []).map((l) => l.toLowerCase());
                        if (itemLocations.some((l) => currentLocations.has(l))) score += 3;

                        const itemSkills = (item.requiredSkills || []).map((s) => s.toLowerCase());
                        const sharedSkills = itemSkills.filter((s) => currentSkillSet.has(s)).length;
                        score += Math.min(sharedSkills, 4);

                        if (item.workMode && item.workMode === opp.workMode) score += 1;
                        return { item, score };
                    })
                    .sort((a: { item: Opportunity; score: number }, b: { item: Opportunity; score: number }) => b.score - a.score)
                    .slice(0, 6)
                    .map((x: { item: Opportunity; score: number }) => x.item);

                setRelatedOpps(scored);
            } catch {
                setRelatedOpps([]);
            } finally {
                setIsLoadingRelated(false);
            }
        };

        void loadRelated();
    }, [opp, opp?.id, opp?.type, opp?.requiredSkills, opp?.locations, opp?.company, opp?.workMode]);

    useEffect(() => {
        if (!showReports) return;

        const handleClickOutside = (event: Event) => {
            if (!reportMenuRef.current) return;
            if (!reportMenuRef.current.contains(event.target as Node)) {
                setShowReports(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowReports(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [showReports]);

    const handleToggleSave = async () => {
        if (!opp) return;

        // OPTIMISTIC UPDATE
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

            // Verify sync result matches optimistic state
            if (result.saved !== newSavedState) {
                setOpp(prev => prev ? { ...prev, isSaved: result.saved } : null);
            }

            if (result.saved) {
                growthApi.trackEvent('SAVE_JOB', 'opportunity_detail').catch(() => undefined);
            }
        } catch (err) {
            if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
                enqueueOfflineSaveToggle(opp.id, user.id);
                toast.success('Saved update queued for sync.');
                return;
            }
            // ROLLBACK
            setOpp(prev => prev ? { ...prev, isSaved: previousSavedState } : null);
            toastError(err, 'Failed to update bookmark');
        }
    };

    const getCurrentActionType = (): ActionType | null => {
        if (!opp?.actions?.length) return null;
        const current = opp.actions[0].actionType as ActionType;
        if (current === ActionType.PLANNING) return ActionType.PLANNED;
        if (current === ActionType.ATTENDED) return ActionType.INTERVIEWED;
        return current;
    };

    const handleSetAction = async (actionType: ActionType) => {
        if (!opp) return;
        if (!user) {
            router.push(loginFromDetailHref);
            return;
        }

        // OPTIMISTIC UPDATE: Update UI immediately
        const previousActions = opp.actions;
        const isWalkinFlow = opp.type === 'WALKIN';
        const label = actionType === ActionType.PLANNED
            ? 'Planned'
            : actionType === ActionType.INTERVIEWED
                ? (isWalkinFlow ? 'Attended' : 'Interviewed')
                : actionType === ActionType.SELECTED
                    ? 'Selected'
                    : 'Applied';

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
        toast.success(`Progress updated: ${label}`);

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            enqueueOfflineActionTrack(opp.id, actionType, user.id);
            return;
        }

        // Background sync
        setIsUpdatingAction(true);
        try {
            await actionsApi.track(opp.id, actionType);
        } catch (err) {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                enqueueOfflineActionTrack(opp.id, actionType, user.id);
                return;
            }
            // ROLLBACK: Revert to previous state
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

        // Track apply click in analytics
        analytics.applyClick(opp.id, opp.company, !!opp.applyLink);

        // Track analytics event
        const applyAction = opp.type === 'WALKIN' ? ActionType.PLANNED : ActionType.APPLIED;
        actionsApi.track(opp.id, applyAction).catch(() => undefined);
        growthApi.trackEvent('APPLY_CLICK', 'opportunity_detail').catch(() => undefined);
        opportunityClicksApi.trackApplyClick(
            opp.id,
            'opportunity_detail',
            opp.applyLink || opp.companyWebsite || null
        ).catch(() => undefined);

        // Open apply link
        if (opp.applyLink) {
            window.open(opp.applyLink, '_blank', 'noopener,noreferrer');
        } else if (opp.companyWebsite) {
            window.open(opp.companyWebsite, '_blank', 'noopener,noreferrer');
        } else {
            toast.error('No application link available');
        }
    };

    const getShareUrl = () => {
        return buildShareUrl(window.location.href, {
            platform: 'other',
            source: 'opportunity_share',
            medium: 'share',
            campaign: 'opportunity_share',
            ref: 'share',
        });
    };

    const handleShare = async () => {
        const shareUrl = getShareUrl();
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
            await navigator.clipboard.writeText(getShareUrl());
            toast.success('Link copied to clipboard!');
        } catch (err) {
            toastError(err, 'Failed to copy link');
        }
    };

    const formatSalary = (opportunity: Opportunity) => {
        if (opportunity.salaryRange) return opportunity.salaryRange;
        if (opportunity.stipend) return opportunity.stipend;

        const period = opportunity.salaryPeriod === 'MONTHLY' ? '/mo' : ' LPA';
        const isMonthly = opportunity.salaryPeriod === 'MONTHLY';
        const sMin = opportunity.salaryMin ?? opportunity.salary?.min;
        const sMax = opportunity.salaryMax ?? opportunity.salary?.max;

        if (sMin != null && sMax != null) {
            if (sMin === 0 && sMax === 0 && opportunity.type === 'INTERNSHIP') return 'Unpaid';
            const formatMin = isMonthly ? sMin.toLocaleString() : (sMin / 100000).toFixed(1);
            const formatMax = isMonthly ? sMax.toLocaleString() : (sMax / 100000).toFixed(1);
            const finalMin = formatMin.endsWith('.0') ? formatMin.slice(0, -2) : formatMin;
            const finalMax = formatMax.endsWith('.0') ? formatMax.slice(0, -2) : formatMax;
            if (finalMin === finalMax) return `₹${finalMin}${period}`;
            return `₹${finalMin}-${finalMax}${period}`;
        }

        if (sMin != null) {
            const formatMin = isMonthly ? sMin.toLocaleString() : (sMin / 100000).toFixed(1);
            const finalMin = formatMin.endsWith('.0') ? formatMin.slice(0, -2) : formatMin;
            return `₹${finalMin}${period}`;
        }

        if (sMax != null) {
            const formatMax = isMonthly ? sMax.toLocaleString() : (sMax / 100000).toFixed(1);
            const finalMax = formatMax.endsWith('.0') ? formatMax.slice(0, -2) : formatMax;
            return `Up to ₹${finalMax}${period}`;
        }

        return 'Not disclosed';
    };

    const isExpired = (opportunity: Opportunity) => {
        if (!opportunity.expiresAt) return false;
        return new Date(opportunity.expiresAt) < new Date();
    };

    const isClosingSoon = (opportunity: Opportunity) => {
        if (!opportunity.expiresAt) return false;
        const expiryDate = new Date(opportunity.expiresAt);
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return expiryDate >= now && expiryDate <= threeDaysFromNow;
    };

    const formatDeadline = (opportunity: Opportunity) => {
        if (!opportunity.expiresAt) return null;
        return new Date(opportunity.expiresAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatEducationLevel = (degree: string): string => {
        switch (degree) {
            case 'DIPLOMA': return 'Diploma';
            case 'DEGREE': return 'Any Graduate';
            case 'PG': return 'Postgraduate';
            default: return degree;
        }
    };

    const formatEducationDisplay = (degrees: string[], courses: string[], specializations: string[] = []): string => {
        const degreeLabels = degrees.map(formatEducationLevel);
        const specializationText = specializations.length > 0 ? `Specializations: ${specializations.join(', ')}` : '';

        // If specific courses are provided, show them with degree level context
        if (courses.length > 0) {
            if (degrees.length > 0) {
                // Show both degree level and specific courses
                const base = `${degreeLabels.join(', ')} (${courses.join(', ')})`;
                return specializationText ? `${base} • ${specializationText}` : base;
            }
            // Only specific courses, no degree level
            const base = courses.join(', ');
            return specializationText ? `${base} • ${specializationText}` : base;
        }

        // If only degree levels, show friendly names
        if (degrees.length > 0) {
            const base = degreeLabels.join(', ');
            return specializationText ? `${base} • ${specializationText}` : base;
        }

        // No restrictions
        return specializationText ? `Any Graduate • ${specializationText}` : 'Any Graduate';
    };


    const handleReport = async (reason: string) => {
        if (!user) {
            toastError(new Error('Identity required to file report.'));
            router.push('/login');
            return;
        }

        const loadingToast = toast.loading('Submitting report...');
        try {
            const data = await feedbackApi.submit(opp!.id, reason) as { success: boolean; message?: string };
            if (data.success) {
                toast.success('Thank you for your feedback', { id: loadingToast });
                setShowReports(false);
            } else {
                toastError(new Error(data.message || 'Unknown error'), 'Report failed.', { id: loadingToast });
            }
        } catch (err: unknown) {
            toastError(err, 'Report failed.', { id: loadingToast });
        }
    };

    if (isLoading) return <OpportunityDetailSkeleton />;
    if (!opp) return null;

    const detailPath = getOpportunityPathFromItem(opp);
    const hasApplyLink = !!opp.applyLink;
    const isWalkinFlow = opp.type === 'WALKIN';
    const currentAction = getCurrentActionType();
    const trackerOptions: Array<{ key: ActionType; label: string }> = [
        ...(isWalkinFlow ? [] : [{ key: ActionType.APPLIED, label: 'Applied' }]),
        { key: ActionType.PLANNED, label: 'Planned' },
        { key: ActionType.INTERVIEWED, label: isWalkinFlow ? 'Attended' : 'Interviewed' },
        { key: ActionType.SELECTED, label: 'Selected' },
    ];
    const sourceParam = searchParams.get('source');
    const fromShare = searchParams.get('ref') === 'share' || sourceParam === 'opportunity_share';
    const loginSource = fromShare ? 'opportunity_share' : 'opportunity_detail';
    const loginFromDetailHref = `/login?redirect=${encodeURIComponent(detailPath)}&source=${encodeURIComponent(loginSource)}&intent=signup`;
    type TimelineEventView = NonNullable<Opportunity['events']>[number] & { _dt: Date };
    const timelineEvents = (opp.events || [])
        .map((event): TimelineEventView => ({ ...event, _dt: new Date(event.eventDate) }))
        .sort((a, b) => a._dt.getTime() - b._dt.getTime());
    const upcomingTimelineEvents = timelineEvents.filter((event) => event._dt.getTime() >= Date.now());

    const jobPostingJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        'title': opp.title,
        'description': opp.description,
        'datePosted': opp.postedAt,
        'validThrough': opp.expiresAt,
        'employmentType': opp.employmentType || (opp.type === 'INTERNSHIP' ? 'INTERN' : 'FULL_TIME'),
        'hiringOrganization': {
            '@type': 'Organization',
            'name': opp.company,
            'sameAs': opp.companyWebsite
        },
        'jobLocation': (opp.locations || []).map(loc => ({
            '@type': 'Place',
            'address': {
                '@type': 'PostalAddress',
                'addressLocality': loc,
                'addressCountry': 'IN'
            }
        })),
        'baseSalary': opp.salaryMin ? {
            '@type': 'MonetaryAmount',
            'currency': 'INR',
            'value': {
                '@type': 'QuantitativeValue',
                'minValue': opp.salaryMin,
                'maxValue': opp.salaryMax,
                'unitText': opp.salaryPeriod || 'YEAR'
            }
        } : undefined
    };

    return (
        <div className="min-h-screen bg-background pb-16 selection:bg-primary/20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
            />
            <main className="relative z-10 max-w-6xl mx-auto px-4 pt-2 pb-4 md:py-7 space-y-3 md:space-y-5">

                {/* Navigation & Actions - Only for logged-in users */}
                <div className="flex items-center justify-between">

                    {user && (
                        <button
                            onClick={() => (window.history.length > 1 ? router.back() : router.push('/opportunities'))}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back
                        </button>
                    )}

                    {user && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleShare}
                                aria-label={`Share ${opp?.title} at ${opp?.company}`}
                                className="p-2 bg-muted/40 hover:bg-primary/10 rounded-lg transition-all text-muted-foreground hover:text-primary border border-border/50 md:px-3 md:gap-2 md:h-9 md:text-xs md:font-semibold md:uppercase md:tracking-widest md:flex md:items-center"
                            >
                                <ShareIcon className="w-4 h-4" aria-hidden="true" />
                                <span className="hidden md:inline">Share</span>
                            </button>
                            <button
                                onClick={handleCopyLink}
                                aria-label="Copy listing link to clipboard"
                                className="p-2 bg-muted/40 hover:bg-primary/10 rounded-lg transition-all text-muted-foreground hover:text-primary border border-border/50 md:px-3 md:gap-2 md:h-9 md:text-xs md:font-semibold md:uppercase md:tracking-widest md:flex md:items-center"
                            >
                                <LinkIcon className="w-4 h-4" aria-hidden="true" />
                                <span className="hidden md:inline">Copy link</span>
                            </button>
                            <div className="relative" ref={reportMenuRef}>
                                <button
                                    onClick={() => setShowReports(!showReports)}
                                    aria-expanded={showReports}
                                    aria-haspopup="menu"
                                    aria-label="Report an issue with this listing"
                                    className={cn(
                                        "p-2 rounded-lg transition-all border",
                                        showReports ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-destructive/5 hover:text-destructive"
                                    )}
                                >
                                    <FlagIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                {showReports && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                                        {[
                                            { id: 'LINK_BROKEN', label: 'Broken Link', icon: ArrowTopRightOnSquareIcon },
                                            { id: 'EXPIRED', label: 'Listing Expired', icon: ClockIcon },
                                            { id: 'DUPLICATE', label: 'Duplicate Item', icon: FlagIcon },
                                            { id: 'INACCURATE', label: 'Invalid Data', icon: ExclamationTriangleIcon }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleReport(item.id)}
                                                className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-muted rounded-lg text-[10px] font-bold text-foreground uppercase tracking-tight transition-all text-left group"
                                            >
                                                <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-start">

                    {/* Left Column: Essential Details (Lg: 8Cols) */}
                    <div className="lg:col-span-8 space-y-3 md:space-y-4">

                        {/* Expired Banner */}
                        {opp.expiresAt && isExpired(opp) && (
                            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 md:p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 bg-destructive/10 rounded-full">
                                    <ClockIcon className="w-6 h-6 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-destructive uppercase tracking-wide">Opportunity Expired</h3>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        This listing is no longer accepting applications. It is visible for historical reference only.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Hero Branding Section */}
                        <div className="bg-card p-4 md:p-5 rounded-xl border border-border relative overflow-hidden group shadow-sm">
                            <div className="relative z-10 space-y-4">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-tight rounded border border-primary/20">
                                        {opp.type}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-muted/40 text-muted-foreground text-[9px] font-bold uppercase tracking-tight rounded border border-border">
                                        {isOnline ? 'Online' : 'Offline'} • Sync {formatSyncTime(detailLastSyncAt)}
                                    </span>
                                    {opp.expiresAt && isExpired(opp) ? (
                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-destructive/5 border border-destructive/10 text-destructive text-[9px] font-bold uppercase tracking-tight rounded">
                                            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                            Expired
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-success/5 border border-success/10 text-success text-[9px] font-bold uppercase tracking-tight rounded">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                            Active
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
                                        {opp.title}
                                    </h1>

                                    <div className="flex items-center gap-3">
                                        <CompanyLogo
                                            companyName={opp.company}
                                            companyWebsite={opp.companyWebsite}
                                            applyLink={opp.applyLink}
                                            className="w-9 h-9 md:w-10 md:h-10 rounded-lg"
                                        />
                                        <div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <h2 className="text-base font-semibold text-foreground tracking-tight leading-none">
                                                    <Link href={`/companies/${encodeURIComponent(opp.company)}`} className="hover:text-primary transition-colors">
                                                        {opp.company}
                                                    </Link>
                                                </h2>
                                                {opp.jobFunction && (
                                                    <span className="text-xs text-muted-foreground font-medium">- {opp.jobFunction}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                                <MapPinIcon className="w-3 h-3" />
                                                <span className="font-medium text-xs md:text-sm">{(opp.locations || []).join(', ') || 'Remote'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="pt-3 border-t border-border/50 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Package</p>
                                        <p className="font-bold text-sm text-foreground truncate">{formatSalary(opp)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Employment</p>
                                        <p className="font-bold text-sm text-foreground truncate">{opp.employmentType || 'Not specified'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Batch</p>
                                        <p className="font-bold text-sm text-foreground truncate">
                                            {opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0
                                                ? [...opp.allowedPassoutYears].sort((a, b) => a - b).join(', ')
                                                : 'Any'}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Experience</p>
                                        <p className="font-bold text-sm text-foreground truncate">{opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher+'}</p>
                                    </div>
                                </div>
                                {opp.expiresAt && (
                                    <OpportunityDeadlineBadge
                                        isExpired={isExpired(opp)}
                                        isClosingSoon={isClosingSoon(opp)}
                                        deadlineLabel={formatDeadline(opp)}
                                    />
                                )}
                            </div>
                        </div>


                        {/* Mobile Actions - Non-logged-in users */}
                        {!user && (
                            <div className="lg:hidden bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                                {hasApplyLink && (
                                    <Button
                                        onClick={handleApply}
                                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide shadow-md"
                                    >
                                        Apply Now
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    </Button>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center justify-center gap-2 h-12 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-primary transition-all text-xs font-bold uppercase tracking-wide"
                                    >
                                        <ShareIcon className="w-4 h-4" />
                                        Share
                                    </button>
                                    <button
                                        onClick={handleCopyLink}
                                        className="flex items-center justify-center gap-2 h-12 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-primary transition-all text-xs font-bold uppercase tracking-wide"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        Copy Link
                                    </button>
                                </div>

                                <button
                                    onClick={() => router.push(loginFromDetailHref)}
                                    className="w-full flex items-center justify-center gap-2 h-12 rounded-lg border transition-all text-xs font-bold uppercase tracking-wide bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                                >
                                    <BookmarkIcon className="w-4 h-4" />
                                    Save
                                </button>
                            </div>
                        )}

                        {/* Mobile Actions - Logged-in users */}
                        {user && (
                            <div className="lg:hidden bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                                {hasApplyLink && (
                                    <Button
                                        onClick={handleApply}
                                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide shadow-md"
                                    >
                                        Apply Now
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    </Button>
                                )}

                                <button
                                    onClick={handleToggleSave}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 h-12 rounded-lg border transition-all text-xs font-bold uppercase tracking-wide",
                                        opp.isSaved ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                                    )}
                                >
                                    {opp.isSaved ? <BookmarkSolidIcon className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
                                    {opp.isSaved ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        )}


                        {/* Description Section */}
                        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Description</h3>
                            <div
                                className="prose prose-sm max-w-none text-foreground/80 font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(opp.description) }}
                            />
                        </div>

                        {timelineEvents.length > 0 && (
                            <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Drive timeline</h3>
                                    {upcomingTimelineEvents.length > 0 && (
                                        <span className="text-[10px] font-semibold text-primary">
                                            {upcomingTimelineEvents.length} upcoming
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {timelineEvents.map((event) => {
                                        const isPast = event._dt.getTime() < Date.now();
                                        return (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "rounded-lg border p-2.5",
                                                    isPast ? "border-border/70 bg-muted/20" : "border-primary/20 bg-primary/5"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-foreground">{event.title}</p>
                                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                                        {event._dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-wide">{event.eventType.replace('_', ' ')}</p>
                                                {event.notes ? (
                                                    <p className="mt-1 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.notes}</p>
                                                ) : null}
                                                {event.sourceLink ? (
                                                    <a
                                                        href={event.sourceLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-flex text-[11px] font-semibold text-primary hover:underline"
                                                    >
                                                        Source update
                                                    </a>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Requirements Section */}
                        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Requirements</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Education</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {formatEducationDisplay(opp.allowedDegrees || [], opp.allowedCourses || [], (opp as { allowedSpecializations?: string[] }).allowedSpecializations || [])}
                                    </p>
                                </div>
                                <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Key Skills</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {(opp.requiredSkills || []).map((s: string) => (
                                            <span key={s} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[10px] font-semibold rounded">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {(opp.jobFunction || opp.incentives) && (
                                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Role details</p>
                                        <p className="text-sm font-semibold text-foreground">{opp.jobFunction || 'General'}</p>
                                        {opp.incentives ? (
                                            <p className="text-xs text-muted-foreground">Incentives: {opp.incentives}</p>
                                        ) : null}
                                    </div>
                                )}
                                {opp.selectionProcess && (
                                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg md:col-span-2">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Selection process</p>
                                        <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{opp.selectionProcess}</p>
                                    </div>
                                )}
                                {opp.notesHighlights && (
                                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg md:col-span-2">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Notes / Highlights</p>
                                        <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{opp.notesHighlights}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Walk-in Drive */}
                        {opp.type === 'WALKIN' && (
                            <div className="bg-card border border-border p-4 md:p-5 rounded-xl space-y-4">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-2">Walk-in Details</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Date & Time</p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {opp.walkInDetails?.dateRange} | {opp.walkInDetails?.timeRange || opp.walkInDetails?.reportingTime}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Venue</p>
                                        <p className="text-xs font-medium text-foreground leading-relaxed">{opp.walkInDetails?.venueAddress}</p>
                                        {opp.walkInDetails?.venueLink && (
                                            <Button
                                                variant="outline"
                                                onClick={() => window.open(opp.walkInDetails?.venueLink, '_blank')}
                                                className="h-8 bg-primary hover:bg-primary/90 border-none text-primary-foreground font-bold uppercase text-[9px] px-3 shadow-sm"
                                            >
                                                View on Maps
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {(opp.walkInDetails?.requiredDocuments?.length || opp.walkInDetails?.contactPerson || opp.walkInDetails?.contactPhone) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {opp.walkInDetails?.requiredDocuments?.length ? (
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Documents</p>
                                                <ul className="text-xs text-foreground space-y-1 list-disc list-inside">
                                                    {opp.walkInDetails.requiredDocuments.map((doc) => (
                                                        <li key={doc}>{doc}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                        {(opp.walkInDetails?.contactPerson || opp.walkInDetails?.contactPhone) && (
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Contact</p>
                                                {opp.walkInDetails?.contactPerson && (
                                                    <p className="text-xs font-medium text-foreground">{opp.walkInDetails.contactPerson}</p>
                                                )}
                                                {opp.walkInDetails?.contactPhone && (
                                                    <p className="text-xs font-medium text-foreground">{opp.walkInDetails.contactPhone}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="lg:hidden bg-card p-4 rounded-xl border border-border space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick actions</h4>
                            <button
                                onClick={() => {
                                    setShowReports(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-all text-[10px] font-bold uppercase"
                            >
                                Report issue
                            </button>
                            <p className="text-[10px] text-muted-foreground">
                                We never charge for placement. Report suspicious activity.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Dynamic Action Sidebar */}
                    <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">

                        {opp.type === 'WALKIN' && (
                            <div className="hidden lg:block bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Walk-in snapshot</h4>
                                <div className="space-y-2 text-xs text-muted-foreground">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time</p>
                                        <p className="text-foreground font-semibold">
                                            {opp.walkInDetails?.dateRange} {opp.walkInDetails?.timeRange ? `• ${opp.walkInDetails.timeRange}` : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Venue</p>
                                        <p className="text-foreground">{opp.walkInDetails?.venueAddress}</p>
                                    </div>
                                    {opp.walkInDetails?.requiredDocuments?.length ? (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Documents</p>
                                            <ul className="list-disc list-inside text-foreground space-y-1">
                                                {opp.walkInDetails.requiredDocuments.map((doc) => (
                                                    <li key={doc}>{doc}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                                {opp.walkInDetails?.venueLink && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(opp.walkInDetails?.venueLink, '_blank')}
                                        className="h-9 w-full bg-primary hover:bg-primary/90 border-none text-primary-foreground font-bold uppercase text-[10px] tracking-widest"
                                    >
                                        Open Maps
                                    </Button>
                                )}
                            </div>
                        )}
                        <EligibilitySnapshotCard
                            education={formatEducationDisplay(opp.allowedDegrees || [], opp.allowedCourses || [], (opp as { allowedSpecializations?: string[] }).allowedSpecializations || [])}
                            experience={opp.experienceMax != null ? `${opp.experienceMin || 0}-${opp.experienceMax} yrs` : 'Fresher+ (no cap)'}
                            employmentType={opp.employmentType}
                            skills={opp.requiredSkills || []}
                        />
                        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                            <div className="space-y-3">
                                {user && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                            Track your progress
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {trackerOptions.map((option) => {
                                                const isActive = currentAction === option.key;
                                                return (
                                                    <button
                                                        key={option.key}
                                                        onClick={() => handleSetAction(option.key)}
                                                        disabled={isUpdatingAction}
                                                        className={cn(
                                                            "h-8 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-all",
                                                            isActive
                                                                ? "bg-primary/10 text-primary border-primary/20"
                                                                : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40",
                                                            isUpdatingAction && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {hasApplyLink && (
                                    <div className="space-y-2">
                                        <Button
                                            onClick={handleApply}
                                            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 text-base font-bold uppercase tracking-tight shadow-lg hover:shadow-xl transition-all"
                                        >
                                            Apply Now
                                            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                router.push(loginFromDetailHref);
                                                return;
                                            }
                                            handleToggleSave();
                                        }}
                                        className={cn(
                                            "flex items-center justify-center gap-2 h-9 rounded-lg border transition-all text-[10px] font-bold uppercase",
                                            opp.isSaved ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        {opp.isSaved ? <BookmarkSolidIcon className="w-3.5 h-3.5" /> : <BookmarkIcon className="w-3.5 h-3.5" />}
                                        {opp.isSaved ? 'Saved' : 'Save'}
                                    </button>
                                </div>
                                {!user && (
                                    <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                                        <Link href={loginFromDetailHref} className="text-primary hover:underline font-semibold">
                                            Create account
                                        </Link> to track and save jobs
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-border flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 italic">Listing Verified</span>
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-primary/40" />
                            </div>
                        </div>

                        <div className="hidden lg:block bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-primary">Live Activity</h4>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Hiring Now</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/80 w-[82%] shadow-[0_0_12px_rgba(var(--primary),0.2)] rounded-full" />
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                    <span className="text-foreground font-bold">{opp?.company}</span> has viewed several applications recently and is actively filtering for this role.
                                </p>
                            </div>
                        </div>

                        <div className="hidden lg:flex p-3.5 items-start gap-3 bg-muted/10 border border-border border-dashed rounded-xl">
                            <InformationCircleIcon className="w-4 h-4 text-primary/40 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-medium text-muted-foreground leading-relaxed uppercase tracking-tight">
                                Fraud protection: We never charge for placement. Report suspicious activity.
                            </p>
                        </div>

                        {user?.role === 'ADMIN' && (
                            <div className="bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-tight text-primary">Admin Control</h4>
                                <Link href={`/admin/opportunities/edit/${opp.id}`} className="block">
                                    <Button variant="outline" className="w-full text-[10px] font-bold uppercase h-8 hover:bg-primary/5">
                                        Edit Opportunity
                                    </Button>
                                </Link>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button className="text-[8px] font-bold uppercase h-7 border border-border rounded">Sync</button>
                                    <button className="text-[8px] font-bold uppercase h-7 border border-destructive/20 text-destructive rounded">Abort</button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Related Opportunities - Moved to end for better content flow */}
                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            Related opportunities
                        </h2>
                        <Link href="/opportunities" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                            Explore all →
                        </Link>
                    </div>

                    {isLoadingRelated ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : relatedOpps.length === 0 ? (
                        <div className="bg-muted/10 border border-border border-dashed rounded-xl p-6 text-center">
                            <p className="text-xs text-muted-foreground">No close matches yet. Check full feed for more roles.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {relatedOpps.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(getOpportunityPathFromItem(item))}
                                    className="text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md p-4 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <CompanyLogo
                                            companyName={item.company}
                                            companyWebsite={item.companyWebsite}
                                            applyLink={item.applyLink}
                                            className="w-9 h-9 rounded-lg shrink-0 mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">{item.title}</p>
                                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 line-clamp-1">{item.company}</p>
                                            <div className="flex items-center gap-3 mt-3">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    {(item.locations || []).join(', ') || 'Remote'}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-tight shrink-0">
                                                    {item.type}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile guest CTA */}
            {!user && (
                /* Guest CTA - Sticky Bottom or Inline */
                <div className="md:hidden fixed bottom-4 left-3 right-3 z-40">
                    <Link href={loginFromDetailHref}>
                        <div className="bg-primary/95 backdrop-blur-md text-primary-foreground p-3 rounded-xl shadow-2xl flex items-center justify-between border border-primary/20 animate-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide">Join FresherFlow</p>
                                <p className="text-[10px] opacity-90">Unlock more verified listings.</p>
                            </div>
                            <div className="h-8 px-4 bg-white text-primary rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-tight shadow-sm">
                                Sign Up Free
                            </div>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
