import { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import CompanyLogo from '@/components/ui/CompanyLogo';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import { getDriveMetadata, isCampusDriveOpportunity } from '@/shared/utils/driveTimeline';
import { getOpportunityDisplaySalary, normalizeSalaryInput, parseOpportunityLocation } from '@/lib/opportunityDisplay';
import { buildShareUrl } from '@/lib/share';

/**
 * JobCard - REFINED TYPOGRAPHY PATTERN
 * Adheres to DESIGN_SYSTEM.md with moderated boldness for professional clarity.
 */

interface JobCardProps {
    job: Opportunity & { matchScore?: number; matchReason?: string };
    jobId: string;
    onClick?: () => void;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isAdmin?: boolean;
    priority?: boolean;
    variant?: 'default' | 'compact';
}

export default function JobCard({ job, onClick, isSaved = false, isApplied = false, onToggleSave, isAdmin, priority = false, variant = 'default' }: JobCardProps) {
    const isDrive = isCampusDriveOpportunity(job);
    const driveMeta = getDriveMetadata(job);



    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleSave) {
            onToggleSave();
        }
    };

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
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    toastError(err, 'Failed to share');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!');
            } catch (err) {
                toastError(err, 'Failed to copy link');
            }
        }
    };

    const isClosingSoon = () => {
        if (!job.expiresAt) return false;
        const expiryDate = new Date(job.expiresAt);
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return expiryDate >= now && expiryDate <= threeDaysFromNow;
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
        if (isExpired()) return 'Expired';
        const days = daysToExpiry();
        if (days === null) return null;
        if (days <= 0) return 'Closing today';
        if (days === 1) return '1 day left';
        if (days <= 3) return `${days} days left`;
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

    const metaChips = (() => {
        const chips: string[] = [];
        chips.push(isDrive ? 'Hiring Drive' : (job.employmentType || job.type) === 'INTERNSHIP' || job.type === 'INTERNSHIP' ? 'Internship' : (job.employmentType || job.type) === 'WALKIN' || job.type === 'WALKIN' ? 'Drive' : 'Full-time');
        if (isDrive) chips.push('Campus 2024-2026');
        if (isDrive) chips.push('0-2 Yrs');
        const maxChips = variant === 'compact' ? 1 : 2;
        const charBudget = variant === 'compact' ? 22 : 34;
        const output: string[] = [];
        let used = 0;
        for (const chip of chips) {
            if (output.length >= maxChips) break;
            const next = used + chip.length;
            if (output.length > 0 && next > charBudget) break;
            output.push(chip);
            used = next;
        }
        return output;
    })();

    const salaryLabel = isDrive
        ? normalizeSalaryInput(driveMeta.maxCtcLabel) ?? null
        : getOpportunityDisplaySalary(job);

    return (
        <div
            className={cn(
                "group relative bg-card border border-slate-300/70 dark:border-white/5 rounded-xl p-4 md:p-5 shadow-md dark:shadow-none transition-all duration-200 hover:border-primary/40 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-0.5 hover:bg-linear-to-b hover:from-white/3 hover:to-transparent flex flex-col gap-3 overflow-hidden",
                isClosingSoon() && !isExpired() && "border-primary/45",
                isExpired() && "opacity-70",
                "cursor-pointer"
            )}
        >
            <Link
                href={getOpportunityPathFromItem(job)}
                onClick={onClick}
                aria-label={`View ${job.title}`}
                className="absolute inset-0 z-10"
            />
            {isClosingSoon() && !isExpired() && (
                <div className="absolute left-0 top-0 h-full w-1 bg-primary/70" />
            )}
            {/* Header: Company + Title + Save */}
            <div className="relative z-20 flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CompanyLogo companyName={job.company} companyWebsite={job.companyWebsite} companyLogoUrl={job.companyLogoUrl} applyLink={job.applyLink} priority={priority} />
                    <div className="min-w-0">
                        <Link
                            href={`/companies/${encodeURIComponent(job.company)}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="text-[12px] font-medium text-muted-foreground line-clamp-1 hover:text-primary transition-colors cursor-pointer block"
                        >
                            {job.company}
                        </Link>
                        {(getPostedLabel() || typeof job.matchScore === 'number') && (
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                {getPostedLabel() && (
                                    <span className={cn(isFreshlyPosted() && "text-primary/90")}>{getPostedLabel()}</span>
                                )}
                                {getPostedLabel() && typeof job.matchScore === 'number' && (
                                    <span className="opacity-40">-</span>
                                )}
                                {typeof job.matchScore === 'number' && (
                                    <span className="text-primary/80 font-medium">
                                        {job.matchScore}% match
                                    </span>
                                )}
                            </div>
                        )}
                        <h3 className="mt-0.5 text-[17px] md:text-[18px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                            {job.normalizedRole || job.title}
                        </h3>
                        {isApplied && (
                            <span className="inline-flex mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium border border-primary/20">
                                Applied
                            </span>
                        )}
                        {typeof job.matchScore === 'number' && job.matchReason && job.matchReason !== 'General fit' && (
                            <div className="mt-1 flex items-center gap-1.5 min-w-0">
                                <p className="text-[10px] font-medium text-muted-foreground truncate">
                                    {job.matchReason}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleShareClick}
                        className="relative z-20 h-9 w-9 rounded-lg transition-all border border-transparent dark:border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
                        title="Share listing"
                        aria-label={`Share ${job.title}`}
                    >
                        <ShareIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleSaveClick}
                        className={cn(
                            "relative z-20 h-9 w-9 rounded-lg transition-all border shrink-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                            isSaved
                                ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                                : "bg-background border-transparent dark:border-border text-muted-foreground hover:border-primary/30"
                        )}
                        aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                    >
                        {isSaved ? <BookmarkSolidIcon className="w-5 h-5" aria-hidden="true" /> : <BookmarkIcon className="w-5 h-5" aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {/* Badges */}
            <div className="relative z-20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden">
                    {metaChips.map((chip, idx) => (
                        <span
                            key={`${chip}-${idx}`}
                            className={cn(
                                "inline-flex shrink-0 items-center px-2 py-0.5 text-[10px] font-medium rounded-full",
                                idx === 0 ? "bg-primary/15 text-primary/90" : "bg-slate-200/80 dark:bg-muted/60 text-muted-foreground"
                            )}
                        >
                            {chip}
                        </span>
                    ))}
                </div>
                {job.expiresAt && (
                    <span
                        className={cn(
                            "inline-flex max-w-[54%] items-center gap-1 px-2 py-0.5 border text-[11px] font-medium normal-case tracking-normal rounded-full whitespace-nowrap",
                            isExpired()
                                ? "bg-destructive/5 border-destructive/20 text-destructive"
                                : isClosingSoon()
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-slate-200/75 dark:bg-muted/40 border-transparent text-muted-foreground"
                        )}
                    >
                        <ClockIcon className="w-3 h-3" aria-hidden="true" />
                        {getExpiryLabel()}
                    </span>
                )}
            </div>

            {/* Key Meta */}
            <div className="relative z-20 flex items-center gap-4 text-[13px] text-muted-foreground min-w-0">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                    <MapPinIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate text-muted-foreground" title={locationInfo.fullLabel}>{locationInfo.shortLabel}</span>
                </span>
                {salaryLabel && (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                        <CurrencyRupeeIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate font-medium text-foreground/90">{salaryLabel}</span>
                    </span>
                )}
            </div>

            {/* Footer */}
            <div className="relative z-20 flex items-center justify-end pt-1">
                <div className="flex items-center gap-1 text-primary text-[14px] font-semibold group-hover:translate-x-0.5 transition-transform duration-300">
                    <span>View Details</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
            </div>

            {/* Admin Edit Shortcut */}
            {isAdmin && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/opportunities/edit/${job.slug || job.id}`;
                    }}
                    className="absolute -top-2 -right-2 p-2 rounded-full bg-card border border-border shadow-lg text-primary hover:bg-primary/10 transition-colors z-30"
                    title="Edit Listing (Admin)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                </div>
            )}
        </div>
    );
}

