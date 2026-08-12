'use client';

import { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import FireIcon from '@heroicons/react/24/outline/FireIcon';
import CheckBadgeIcon from '@heroicons/react/24/outline/CheckBadgeIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import FlagIcon from '@heroicons/react/24/outline/FlagIcon';
import EllipsisVerticalIcon from '@heroicons/react/24/outline/EllipsisVerticalIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import ArrowsRightLeftIcon from '@heroicons/react/24/outline/ArrowsRightLeftIcon';
import { useState, useMemo, useEffect } from 'react';
import CompanyLogo from '@/ui/CompanyLogo';
import toast from 'react-hot-toast';
import { toastError } from '@repo/ui/utils/error-web';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import { SkillPill } from '@/ui/SkillPill';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import { useFirebaseTracker } from '@/lib/hooks/useFirebaseTracker';
import { saveOpportunityToCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { ActionType } from '@fresherflow/types';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { getDriveMetadata, isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { getOpportunityDisplaySalary, normalizeSalaryInput, parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { buildShareUrl } from '@/lib/utils/share';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/ui/DropdownMenu';
import { Hint } from '@/ui/Tooltip';
import { promptLoginToast } from '@/lib/utils/toastUtils';

interface JobCardProps {
    job: Opportunity & { matchScore?: number; matchReason?: string };
    jobId: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isAdmin?: boolean;
    priority?: boolean;
    /**
     * Card display variant:
     * - 'default'  — full card with all details, used on job detail/standalone pages
     * - 'compact'  — two-row card used in BOTH split-pane left column AND full-width list mode
     *               (split: ~45% width inside grid; list: max-w-3xl centered single column)
     * - 'wide'     — horizontal single-row card (legacy, kept for reference)
     */
    variant?: 'vertical' | 'compact' | 'wide';
    isSelected?: boolean;
    searchQuery?: string;
    searchedSkill?: string;
    className?: string;
}

type JobAction = {
    actionType: string;
};

type JobWithActions = Opportunity & {
    actions?: JobAction[];
    matchScore?: number;
    matchReason?: string;
};

const getAtsName = (link?: string | null) => {
    if (!link) return null;
    try {
        const url = new URL(link);
        const host = url.hostname.toLowerCase();
        
        // CodeQL [js/incomplete-url-substring-sanitization] false positive — display only
        
        if (host.includes('greenhouse.io')) return 'Greenhouse';
        if (host.includes('lever.co')) return 'Lever';
        if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) return 'Workday';
        if (host.includes('ashbyhq.com')) return 'Ashby';
        if (host.includes('bamboohr.com')) return 'BambooHR';
        if (host.includes('breezy.hr')) return 'BreezyHR';
        if (host.includes('smartrecruiters.com')) return 'SmartRecruiters';
        if (host.includes('workable.com')) return 'Workable';
        if (host.includes('icims.com')) return 'iCIMS';
        if (host.includes('jobvite.com')) return 'Jobvite';
        if (host.includes('recruitee.com')) return 'Recruitee';
        if (host.includes('phenompro.com') || host.includes('phenom.com')) return 'Phenom';
        if (host.includes('taleo.net')) return 'Taleo';
        if (host.includes('successfactors.com') || host.includes('successfactors.eu')) return 'SuccessFactors';
        if (host.includes('darwinbox.in') || host.includes('darwinbox.com')) return 'Darwinbox';
        if (host.includes('eightfold.ai')) return 'Eightfold';
        if (host.includes('mercor.com')) return 'Mercor';
        
        if (host.includes('careers')) return 'Careers';
        
        const parts = host.split('.');
        if (parts.length >= 2) {
            const domain = parts[parts.length - 2];
            return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
    } catch {}
    return null;
};


function getVisibleSkills(skills: string[] = [], budget: number = 30) {
    const visible: string[] = [];
    let currentLen = 0;
    for (const s of skills) {
        const est = s.length + 3;
        if (currentLen + est > budget && visible.length > 0) {
            break;
        }
        visible.push(s);
        currentLen += est;
    }
    return {
        visible,
        remainingCount: skills.length - visible.length
    };
}

export function reorderSkillsBySearch(skills: string[] = [], searchQuery?: string): string[] {
    if (!skills.length || !searchQuery || !searchQuery.trim()) {
        return skills;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const queryTokens = normalizedQuery
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 1);

    const matches: string[] = [];
    const nonMatches: string[] = [];

    for (const skill of skills) {
        const lowerSkill = skill.toLowerCase();
        const isMatch = lowerSkill === normalizedQuery ||
            normalizedQuery.includes(lowerSkill) ||
            lowerSkill.includes(normalizedQuery) ||
            queryTokens.some(token => lowerSkill.includes(token) || token.includes(lowerSkill));

        if (isMatch) {
            matches.push(skill);
        } else {
            nonMatches.push(skill);
        }
    }

    return [...matches, ...nonMatches];
}

export default function JobCard({
    job,
    jobId,
    onClick,
    isSaved,
    isApplied = false,
    onToggleSave,
    isAdmin,
    priority = false,
    variant = 'wide',
    isSelected = false,
    searchQuery,
    searchedSkill,
    className
}: JobCardProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const router = useRouter();
    const { user, profile } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    const { writeTrackerItem } = useFirebaseTracker(user?.id);

    const handleApplyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const targetUrl = job.applyLink || job.companyWebsite;
        const applyAction = job.type === 'WALKIN' ? ActionType.PLANNED : ActionType.APPLIED;
        
        const targetId = jobId || job.id;
        if (job) {
            saveOpportunityToCache({ ...job, id: targetId } as any);
        }
        writeTrackerItem(targetId, applyAction).catch(() => undefined);

        if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            toast.success('Opening application link...');
        } else {
            toast.error('No application link available');
        }
    };

    const handleReportClick = async (e: React.MouseEvent, reason: string) => {
        e.stopPropagation();
        if (!user) {
            toast.error('Please log in to report listings');
            router.push(loginRedirectHref);
            return;
        }
        const loadingToast = toast.loading('Submitting report...');
        try {
            const { feedbackApi } = await import('@/lib/api/client');
            await feedbackApi.submit(jobId, reason);
            toast.success('Thank you for your report! Our team will verify this listing.', { id: loadingToast });
        } catch {
            toast.success('Thank you for your report! Our team will verify this listing.', { id: loadingToast });
        }
    };

    const isDrive = isCampusDriveOpportunity(job);
    const driveMeta = getDriveMetadata(job);

    const effectiveSearchQuery = (
        searchQuery ||
        searchedSkill ||
        searchParams?.get('q') ||
        searchParams?.get('search') ||
        searchParams?.get('skill') ||
        searchParams?.get('query') ||
        ''
    ).trim();

    const orderedSkills = useMemo(() => {
        return reorderSkillsBySearch(job.requiredSkills || [], effectiveSearchQuery);
    }, [job.requiredSkills, effectiveSearchQuery]);

    const skillsBudget = variant === 'compact' ? 52 : 80;
    const { visible: visibleSkills, remainingCount } = getVisibleSkills(orderedSkills, skillsBudget);

    const selectedSkills = useMemo(() => {
        const skills = searchParams?.getAll('skills') || [];
        if (skills.length > 0) return skills.map(s => s.toLowerCase());
        const str = searchParams?.get('skills');
        if (str) return str.split(',').map(s => s.trim().toLowerCase());
        return [];
    }, [searchParams]);

    const targetId = jobId || job.id;
    const isJobSaved = isSaved !== undefined ? isSaved : Boolean(savedJobsMap[targetId] || savedJobsMap[job.id]);

    const currentPath = encodeURIComponent(`${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`);
    const loginRedirectHref = `/login?redirect=${currentPath}`;

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }
        if (job) {
            saveOpportunityToCache({ ...job, id: targetId } as any);
        }
        if (onToggleSave) {
            onToggleSave();
        } else {
            toggleSavedJob(targetId)
                .then(() => {
                    toast.success(savedJobsMap[targetId] ? 'Removed from bookmarks' : 'Added to bookmarks');
                })
                .catch(() => {
                    toast.error('Bookmark update failed');
                });
        }
    };

    const heatBadge = job.shareCount && job.shareCount > 10 ? 'Trending' : null;
    const isTrusted = job.verificationFailures === 0 && (job.shareCount || 0) > 5;

    const trackerAction = (job as JobWithActions).actions?.find?.((a: JobAction) =>
        ['APPLIED', 'PLANNED', 'SAVED_FOR_LATER', 'INTERVIEWING', 'OFFERED', 'REJECTED'].includes(a.actionType)
    );
    const trackerStatus: string | null = trackerAction?.actionType ?? null;

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = buildShareUrl(`${window.location.origin}${getOpportunityPathFromItem(job)}`, {
            platform: 'other',
            source: 'opportunity_share',
            medium: 'share',
            campaign: 'opportunity_share',
            ref: 'share',
        });
        const shareData = {
            title: job.normalizedRole || job.title,
            text: `Check out this ${job.normalizedRole || job.title} opportunity at ${job.company} on FresherFlow!`,
            url: shareUrl,
        };

        import('@/lib/api/client').then(({ growthApi }) => {
            growthApi.trackEvent('SHARE_JOB', 'opportunity_card').catch(() => undefined);
        });

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err: unknown) {
                if ((err as Error).name !== 'AbortError') {
                    toastError(err, 'Failed to share');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!');
            } catch (err: unknown) {
                toastError(err, 'Failed to copy link');
            }
        }
    };

    const isExpired = () => {
        if (!job.expiresAt) return false;
        return new Date(job.expiresAt) < new Date();
    };

    const daysToExpiry = () => {
        if (!job.expiresAt) return null;
        const diff = new Date(job.expiresAt).getTime() - new Date().getTime();
        return Math.ceil(diff / (24 * 60 * 60 * 1000));
    };

    const getExpiryLabel = () => {
        if (!job.expiresAt) return null;
        if (isExpired()) return isGovernment ? 'Closed' : 'Expired';
        const days = daysToExpiry();
        if (days === null) return null;
        if (days <= 0) return 'Closing today';
        if (days === 1) return '1 day left';
        if (days <= 3) return `${days} days left`;
        
        if (isGovernment) {
            const dateStr = new Date(job.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            return `Apply by ${dateStr}`;
        }
        
        return `Closes in ${days} days`;
    };

    const locationInfo = isDrive
        ? { shortLabel: 'PAN India', fullLabel: 'PAN India' }
        : parseOpportunityLocation(job.locations);

    const getPostedLabel = () => {
        const postedAt = job.postedAt ? new Date(job.postedAt) : null;
        if (!postedAt || Number.isNaN(postedAt.getTime())) return null;
         
        const diff = Date.now() - postedAt.getTime();
        const days = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
        if (days === 0) return 'Posted today';
        if (days === 1) return 'Posted 1 day ago';
        return `Posted ${days} days ago`;
    };

    const isFreshlyPosted = () => {
        const postedAt = job.postedAt ? new Date(job.postedAt) : null;
        if (!postedAt || Number.isNaN(postedAt.getTime())) return false;
         
        const diff = Date.now() - postedAt.getTime();
        const days = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
        return days <= 1;
    };

    const isGovernment = Boolean(job.governmentJobDetails) || (job.type as any) === 'GOVERNMENT';
    const govtMeta = job.governmentJobDetails as any;
    const totalVacancies = govtMeta?.totalVacancies;
    const payScale = govtMeta?.payScale;
    const govtStatus: string | undefined = govtMeta?.applicationStatus;

    const GOVT_STATUS_META: Record<string, { label: string; className: string; ribbonClass: string }> = {
        UPCOMING:              { label: 'Upcoming',         className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        OPEN:                  { label: 'Apply Now',         className: 'bg-muted/70 border-border/70 text-foreground/90', ribbonClass: '' },
        CLOSED:                { label: 'Closed',           className: 'bg-muted/70 border-border/70 text-muted-foreground', ribbonClass: '' },
        EXAM_SCHEDULED:        { label: 'Exam Scheduled',   className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        ADMIT_CARD_RELEASED:   { label: 'Admit Card Out',   className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        ANSWER_KEY_RELEASED:   { label: 'Answer Key Out',   className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        RESULT_DECLARED:       { label: 'Result Declared',  className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        COUNSELLING:           { label: 'Counselling',       className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        DOCUMENT_VERIFICATION: { label: 'Doc Verification', className: 'bg-muted/70 border-border/70 text-foreground/80', ribbonClass: '' },
        COMPLETED:             { label: 'Completed',         className: 'bg-muted/70 border-border/70 text-muted-foreground', ribbonClass: '' },
        CANCELLED:             { label: 'Cancelled',         className: 'bg-muted/70 border-border/70 text-muted-foreground', ribbonClass: '' },
    };
    const govtStatusMeta = govtStatus ? GOVT_STATUS_META[govtStatus] : undefined;

    const salaryLabel = isGovernment && payScale
        ? payScale
        : isDrive
        ? normalizeSalaryInput(driveMeta.maxCtcLabel) ?? null
        : getOpportunityDisplaySalary(job);

    // ── COMPACT & WIDE variants ──────────────────────────────────────────────────────
    // Used in three contexts:
    //   1. Split-pane LEFT column  → CategoryPageView when showDetail=true  (~45% width, variant='compact')
    //   2. Full-width list mode    → CategoryPageView when showDetail=false  (max-w-3xl, variant='wide')
    //   3. Saved jobs / dashboard lists
    if (variant === 'compact' || variant === 'wide') {
        const isCompact = variant === 'compact';
        const workModeLabel = (job.workMode as string) || (job as any).mode || null;
        const skillsList = (job.requiredSkills || []).slice(0, 6);
        const skillOverflow = (job.requiredSkills?.length || 0) - skillsList.length;

        return (
            <div
                onClick={(e) => {
                    // Ignore clicks on interactive elements
                    if ((e.target as HTMLElement).closest('a, button, [role="menuitem"]')) {
                        return;
                    }
                    if (onClick) {
                        onClick(e as any);
                    }
                    if (!e.defaultPrevented) {
                        router.push(getOpportunityPathFromItem(job));
                    }
                }}
                className={cn(
                    "group relative bg-card border rounded-xl p-3.5 flex items-start gap-3 md:gap-3.5 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer",
                    isSelected ? "border-primary/70 ring-2 ring-primary/10 shadow-md" : "border-transparent",
                    isExpired() && "opacity-60",
                    className
                )}
            >

                {/* Left Section: Logo */}
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    priority={priority}
                    isGovernment={isGovernment}
                    className="!w-10 !h-10 rounded-lg shrink-0 border border-border/50 shadow-xs"
                />

                {/* Center Section: Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                    {/* Header info: Title + Company + Location */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="focus:outline-none cursor-pointer" onClick={(e) => {
                                if (onClick) {
                                    onClick(e as any);
                                }
                                if (!e.defaultPrevented) {
                                    router.push(getOpportunityPathFromItem(job));
                                }
                            }}>
                                <h2 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                                    {job.normalizedRole || job.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5 truncate">
                                <span className="font-semibold text-foreground/80 truncate shrink-0 max-w-[120px] md:max-w-none">{job.company}</span>
                                <span className="text-muted-foreground/40 shrink-0">•</span>
                                <span className="inline-flex items-center gap-1 truncate min-w-0">
                                    <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{locationInfo.shortLabel}</span>
                                </span>
                            </div>
                        </div>

                        {/* Top Right: Time and Options */}
                        <div className="flex items-center gap-2 shrink-0 relative z-20 pointer-events-auto">
                            {getPostedLabel() && (
                                <span className={cn(
                                    "text-xs font-medium text-muted-foreground",
                                    isFreshlyPosted() && "text-primary"
                                )}>
                                    {getPostedLabel()}
                                </span>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-6 w-6 rounded border-transparent hover:border-border/60 bg-transparent hover:bg-muted/35 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all outline-none"
                                        aria-label="Job options"
                                    >
                                        <EllipsisVerticalIcon className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 z-50">
                                    <DropdownMenuItem onClick={handleSaveClick} className="cursor-pointer text-xs">
                                        {isJobSaved ? <BookmarkSolidIcon className="w-3.5 h-3.5 mr-2 text-primary" /> : <BookmarkIcon className="w-3.5 h-3.5 mr-2" />}
                                        <span>{isJobSaved ? 'Remove Bookmark' : 'Save Job'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick} className="cursor-pointer text-xs">
                                        <ShareIcon className="w-3.5 h-3.5 mr-2" />
                                        <span>Share Job</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {[
                                        { id: 'EXPIRED', label: 'Expired' },
                                        { id: 'LINK_BROKEN', label: 'Broken Link' },
                                        { id: 'INACCURATE', label: 'Inaccurate' },
                                        { id: 'SPAM', label: 'Spam' },
                                    ].map(item => (
                                        <DropdownMenuItem key={item.id} onClick={e => handleReportClick(e, item.id)} className="cursor-pointer text-xs">
                                            <FlagIcon className="w-3.5 h-3.5 mr-2 text-destructive" />
                                            <span>{item.label}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Meta tags: Work Mode, Salary, Type Badge, Expiry */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Work Mode Badge */}
                        {workModeLabel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-muted-foreground bg-muted border border-border/50 shrink-0">
                                {workModeLabel.toLowerCase() === 'remote' ? (
                                    <HomeIcon className="w-3.5 h-3.5" />
                                ) : workModeLabel.toLowerCase() === 'hybrid' ? (
                                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                                ) : (
                                    <BuildingOfficeIcon className="w-3.5 h-3.5" />
                                )}
                                {workModeLabel.charAt(0).toUpperCase() + workModeLabel.slice(1).toLowerCase()}
                            </span>
                        )}

                        {/* Salary Badge */}
                        {salaryLabel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <CurrencyRupeeIcon className="w-3.5 h-3.5" />
                                {salaryLabel}
                            </span>
                        )}
                        
                        {/* Type Badge (Job/Intern/Walk-in) */}
                        <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold shrink-0 bg-primary/10 border border-primary/20 text-primary transition-colors z-20 relative pointer-events-auto"
                        >
                            {isDrive ? 'Drive' : job.type === 'INTERNSHIP' ? 'Intern' : job.type === 'WALKIN' ? 'Walk-in' : 'Job'}
                        </span>
                        
                        {/* ATS Badge */}
                        {(() => {
                            const ats = getAtsName(job.applyLink || (job as any).sourceLink);
                            if (ats) {
                                return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-muted-foreground bg-muted border border-border/50 shrink-0">
                                        {ats}
                                    </span>
                                );
                            }
                            return null;
                        })()}

                        {/* Govt / Expiry Badge */}
                        {isGovernment && govtStatusMeta ? (
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 border text-xs font-medium rounded",
                                govtStatusMeta.className
                            )}>
                                {govtStatusMeta.label}
                            </span>
                        ) : !isGovernment && job.expiresAt && (
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 border text-xs font-medium rounded",
                                isExpired()
                                    ? 'bg-destructive/5 border-destructive/25 text-destructive'
                                    : 'bg-muted/70 border-border/70 text-foreground/70'
                            )}>
                                <ClockIcon className="w-3.5 h-3.5" />
                                {getExpiryLabel()}
                            </span>
                        )}
                    </div>

                    {/* Bottom Row: Skills on left, Save/Apply on right */}
                    <div className="flex items-end justify-between mt-0.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                            {/* Skills (Max 2 rows for wide, 1 row for compact) */}
                            <div className={cn(
                                "flex flex-wrap items-center gap-1.5 overflow-hidden",
                                isCompact ? "max-h-[24px]" : "max-h-[24px] md:max-h-[50px]"
                            )}>
                                {skillsList.map(s => (
                                    <SkillPill
                                        key={s}
                                        skill={s.charAt(0).toUpperCase() + s.slice(1)}
                                        size="sm"
                                        className={cn(
                                            "py-0.5 text-xs",
                                            selectedSkills.includes(s.toLowerCase()) && "!bg-indigo-50 !text-indigo-700 !border-indigo-200"
                                        )}
                                    />
                                ))}
                                {skillOverflow > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted border border-border/50 text-muted-foreground">
                                        +{skillOverflow}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions (Bookmark + Apply) */}
                        <div className="flex items-center gap-2 shrink-0 relative z-20 pointer-events-auto h-8">
                            <button
                                type="button"
                                onClick={handleSaveClick}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                aria-label="Save Job"
                            >
                                {isJobSaved ? <BookmarkSolidIcon className="w-4 h-4 text-primary" /> : <BookmarkIcon className="w-4 h-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyClick}
                                className={cn(
                                    "inline-flex items-center justify-center gap-1.5 px-4 h-8 text-xs font-semibold rounded-lg bg-primary text-primary-foreground transition-all duration-200 cursor-pointer shadow-xs",
                                    "opacity-100 md:opacity-0 md:-translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0",
                                    "hover:bg-primary/90"
                                )}
                            >
                                <span>Apply</span>
                                <PaperAirplaneIcon className="w-3.5 h-3.5 -rotate-45 -mt-0.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── VERTICAL variant (legacy/government) ──────────────────────────────────────────────────
    return (
        <div
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('a, button, [role="menuitem"]')) {
                    return;
                }
                if (onClick) {
                    onClick(e as any);
                }
                if (!e.defaultPrevented) {
                    router.push(getOpportunityPathFromItem(job));
                }
            }}
            className={cn(
                "group relative bg-card border rounded-2xl p-3.5 md:p-4 shadow-xs transition-all duration-200 ease-out hover:shadow-md hover:border-primary/40 flex flex-col justify-start gap-2.5 overflow-hidden w-full h-auto",
                isSelected
                    ? "border-primary/70 ring-2 ring-primary/10 shadow-md"
                    : "border-transparent",
                isExpired() && "opacity-60",
                "cursor-pointer",
                className
            )}
        >



            {/* Top Bar: Role Title + 3-dots Menu */}
            <div className="flex items-start justify-between gap-3 relative z-20 pointer-events-none">
                <div className="min-w-0 flex-1">
                    <h2 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {job.normalizedRole || job.title}
                    </h2>
                </div>

                {/* 3-dots Menu Button */}
                <div className="relative z-20 pointer-events-auto shrink-0 -mt-1 -mr-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="h-8 w-8 rounded-lg border-transparent hover:border-border/60 bg-transparent hover:bg-muted/35 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-150 active:scale-95 outline-none"
                                aria-label="Job options"
                            >
                                <EllipsisVerticalIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 z-50">
                            <DropdownMenuItem onClick={handleSaveClick} className="cursor-pointer text-xs">
                                {isJobSaved ? <BookmarkSolidIcon className="w-4 h-4 mr-2 text-primary" /> : <BookmarkIcon className="w-4 h-4 mr-2" />}
                                <span>{isJobSaved ? 'Remove Bookmark' : 'Save Job'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleShareClick} className="cursor-pointer text-xs">
                                <ShareIcon className="w-4 h-4 mr-2" />
                                <span>Share Job</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                                Report Listing
                            </DropdownMenuLabel>
                            {[
                                { id: 'EXPIRED', label: 'Job Expired / Closed' },
                                { id: 'LINK_BROKEN', label: 'Broken Apply Link' },
                                { id: 'INACCURATE', label: 'Inaccurate Details' },
                                { id: 'SPAM', label: 'Spam or Fake Job' },
                            ].map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={(e) => handleReportClick(e, item.id)}
                                    className="cursor-pointer text-xs"
                                >
                                    <FlagIcon className="w-3.5 h-3.5 mr-2 text-destructive" />
                                    <span>{item.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Company Info */}
            <div className="flex items-center gap-3 relative z-20 pointer-events-none mt-1">
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    priority={priority}
                    isGovernment={isGovernment}
                    className="!w-8 !h-8 rounded-lg shrink-0"
                />
                <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-sm font-semibold text-muted-foreground line-clamp-1 block">
                        {job.company}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span
                            className="inline-flex shrink-0 items-center px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary border border-primary/20 transition-colors pointer-events-auto"
                        >
                            {isDrive ? 'Drive' : isGovernment ? ((job as any).governmentJobDetails?.jobCategory?.[0] || 'Govt') : (job.employmentType || job.type) === 'INTERNSHIP' || job.type === 'INTERNSHIP' ? 'Intern' : (job.employmentType || job.type) === 'WALKIN' || job.type === 'WALKIN' ? 'Walk-in' : 'Full-time'}
                        </span>
                        {(() => {
                            const ats = getAtsName(job.applyLink || (job as any).sourceLink);
                            if (ats) {
                                return (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted/80 text-foreground text-xs font-bold border border-border/70">
                                        {ats}
                                    </span>
                                );
                            }
                            return null;
                        })()}
                        {heatBadge && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-bold uppercase border border-amber-500/20">
                                <FireIcon className="w-3.5 h-3.5" />
                                {heatBadge}
                            </span>
                        )}
                        {isTrusted && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted/80 text-foreground text-xs font-bold uppercase border border-border/70">
                                <CheckBadgeIcon className="w-3.5 h-3.5" />
                                Trusted
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Location + Salary */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div onClick={(e) => { e.stopPropagation(); router.push(`/jobs?location=${encodeURIComponent(locationInfo.shortLabel)}`); }} className="inline-flex items-center gap-1 min-w-0 hover:text-primary transition-colors cursor-pointer">
                    <MapPinIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate" title={locationInfo.fullLabel}>{locationInfo.shortLabel}</span>
                </div>
                {salaryLabel && (
                    <span className="inline-flex items-center gap-1 min-w-0">
                        <CurrencyRupeeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate font-semibold text-foreground/90">{salaryLabel}</span>
                    </span>
                )}
                {isGovernment && totalVacancies && (
                    <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40 text-xs">
                        Vacancies: <span className="text-primary font-bold">{Number(totalVacancies).toLocaleString('en-IN')}</span>
                    </span>
                )}
            </div>

            {/* Skills Pills */}
            {visibleSkills.length > 0 && (
                <div className="flex flex-row flex-wrap items-center gap-1">
                    {visibleSkills.map((skill, idx) => {
                        const isMatched = mounted && Boolean(profile?.skills?.some(s => s.toLowerCase() === skill.toLowerCase()));
                        const isSearched = Boolean(effectiveSearchQuery && (
                            skill.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
                            effectiveSearchQuery.toLowerCase().includes(skill.toLowerCase())
                        ));
                        return (
                            <div key={`${skill}-${idx}`} onClick={(e) => { e.stopPropagation(); router.push(`/jobs?skills=${encodeURIComponent(skill)}`); }} className="cursor-pointer">
                                <SkillPill
                                    skill={skill.charAt(0).toUpperCase() + skill.slice(1)}
                                    size="xs"
                                    className={cn(
                                        "hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer",
                                        selectedSkills.includes(skill.toLowerCase())
                                            ? "!bg-indigo-50 !text-indigo-700 !border-indigo-200"
                                            : isSearched
                                            ? "bg-primary/20 text-primary border-primary/30 font-bold ring-1 ring-primary/20"
                                            : isMatched
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                : ""
                                    )}
                                />
                            </div>
                        );
                    })}
                    {remainingCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground border border-border/40 whitespace-nowrap shrink-0">
                            +{remainingCount}
                        </span>
                    )}
                </div>
            )}

            {/* Footer Row: Posted/Expiry Info + Apply Button */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30 relative z-20 pointer-events-auto">
                <div className="flex items-center gap-2 min-w-0">
                    {getPostedLabel() && (
                        <span className={cn("text-[11px] font-medium text-muted-foreground shrink-0", isFreshlyPosted() && "text-primary")}>
                            {getPostedLabel()}
                        </span>
                    )}
                    {isGovernment && govtStatusMeta ? (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-semibold rounded whitespace-nowrap",
                            govtStatusMeta.className
                        )}>
                            {govtStatusMeta.label}
                        </span>
                    ) : !isGovernment && job.expiresAt && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-semibold rounded whitespace-nowrap",
                                isExpired()
                                    ? "bg-destructive/5 border-destructive/25 text-destructive"
                                    : "bg-muted/70 border-border/70 text-foreground/80"
                            )}
                        >
                            <ClockIcon className="w-3 h-3" aria-hidden="true" />
                            {getExpiryLabel()}
                        </span>
                    )}
                    {(trackerStatus === 'APPLIED' || (!trackerStatus && isApplied)) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase tracking-wider border border-primary/20">
                            Applied
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleApplyClick}
                    className={cn(
                        "relative z-20 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.95] transition-opacity duration-150 ease-out cursor-pointer shadow-xs pointer-events-auto shrink-0",
                        "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    )}
                    title="Apply to job"
                >
                    <span>Apply</span>
                </button>
            </div>

            {/* Admin Edit Shortcut */}
            {isAdmin && (
                <Hint label="Edit Listing (Admin)" side="top">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/opportunities/edit/${job.slug || job.id}`);
                        }}
                        className="absolute top-2 right-12 p-1.5 rounded-full bg-card border border-border shadow-lg text-primary hover:bg-primary/10 transition-colors z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        aria-label="Edit Listing (Admin)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                </Hint>
            )}
        </div>
    );
}


