import { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import CompanyLogo from '@/components/ui/CompanyLogo';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import { getDriveMetadata, isCampusDriveOpportunity } from '@/shared/utils/driveTimeline';

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

    const formatSalary = () => {
        if (job.salaryRange) return job.salaryRange;
        if (job.stipend) return job.stipend;

        const period = job.salaryPeriod === 'MONTHLY' ? '/mo' : ' LPA';
        const isMonthly = job.salaryPeriod === 'MONTHLY';

        const sMin = job.salaryMin !== undefined ? job.salaryMin : job.salary?.min;
        const sMax = job.salaryMax !== undefined ? job.salaryMax : job.salary?.max;

        if (sMin != null && sMax != null) {
            if (sMin === 0 && sMax === 0 && job.type === 'INTERNSHIP') return 'Unpaid';

            const formatMin = isMonthly ? sMin.toLocaleString() : (sMin / 100000).toFixed(1);
            const formatMax = isMonthly ? sMax.toLocaleString() : (sMax / 100000).toFixed(1);

            const finalMin = formatMin.endsWith('.0') ? formatMin.slice(0, -2) : formatMin;
            const finalMax = formatMax.endsWith('.0') ? formatMax.slice(0, -2) : formatMax;

            if (finalMin === finalMax) {
                return `₹${finalMin}${period}`;
            }
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



    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleSave) {
            onToggleSave();
        }
    };

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}${getOpportunityPathFromItem(job)}`;
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

    const formatExpiryDate = () => {
        if (!job.expiresAt) return null;
        return new Date(job.expiresAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short'
        });
    };

    const daysToExpiry = () => {
        if (!job.expiresAt) return null;
        const diff = new Date(job.expiresAt).getTime() - new Date().getTime();
        return Math.ceil(diff / (24 * 60 * 60 * 1000));
    };

    const getLocationLabel = () => {
        if (isDrive) return 'PAN India';
        const locations = Array.isArray(job.locations) ? job.locations.filter(Boolean) : [];
        if (locations.length === 0) return 'Remote';
        return locations.join(', ');
    };

    const metaChips = (() => {
        const chips: string[] = [];
        chips.push(isDrive ? 'Hiring Drive' : (job.employmentType || job.type) === 'INTERNSHIP' || job.type === 'INTERNSHIP' ? 'Internship' : (job.employmentType || job.type) === 'WALKIN' || job.type === 'WALKIN' ? 'Drive' : 'Full-time');
        if (isDrive) chips.push('Campus 2024-2026');
        if (isDrive) chips.push('0-2 Yrs');
        const maxChips = variant === 'compact' ? 2 : 3;
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

    return (
        <div
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
            role="button"
            tabIndex={0}
            className={cn(
                "group relative bg-card border border-border rounded-xl p-5 transition-all hover:border-primary/30 hover:shadow-md flex flex-col gap-4 focus:outline-none focus:ring-2 focus:ring-primary/40 overflow-hidden",
                variant === 'compact'
                    ? "h-[336px] md:h-[348px]"
                    : "h-[352px] md:h-[368px]",
                onClick && "cursor-pointer"
            )}
        >
            {/* Header: Company + Title + Save */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CompanyLogo companyName={job.company} companyWebsite={job.companyWebsite} companyLogoUrl={job.companyLogoUrl} applyLink={job.applyLink} priority={priority} />
                    <div className="min-w-0">
                        <Link
                            href={`/companies/${encodeURIComponent(job.company)}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide line-clamp-1 hover:text-primary transition-colors cursor-pointer block"
                        >
                            {job.company}
                        </Link>
                        <div className="min-h-[2.6rem] mt-1">
                            <h3 className="text-[16px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                {job.normalizedRole || job.title}
                            </h3>
                        </div>
                        {typeof job.matchScore === 'number' && (
                            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    Match {job.matchScore}%
                                </span>
                                <p className="text-[10px] font-medium text-muted-foreground truncate">
                                    {job.matchReason || 'Profile fit'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleShareClick}
                        className="h-9 w-9 rounded-lg transition-all border border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
                        title="Share listing"
                        aria-label={`Share ${job.title}`}
                    >
                        <ShareIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                        onClick={handleSaveClick}
                        className={cn(
                            "h-9 w-9 rounded-lg transition-all border shrink-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                            isSaved
                                ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                                : "bg-background border-border text-muted-foreground hover:border-primary/30"
                        )}
                        aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                    >
                        {isSaved ? <BookmarkSolidIcon className="w-5 h-5" aria-hidden="true" /> : <BookmarkIcon className="w-5 h-5" aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden">
                    {metaChips.map((chip, idx) => (
                        <span
                            key={`${chip}-${idx}`}
                            className={cn(
                                "inline-flex shrink-0 items-center px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-full",
                                idx === 0 ? "bg-primary/10 border-primary/25 text-primary" : "bg-muted/60 border-border text-foreground"
                            )}
                        >
                            {chip}
                        </span>
                    ))}
                </div>
                {job.expiresAt && (
                    <span
                        className={cn(
                            "inline-flex max-w-[54%] items-center gap-1 px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap",
                            isExpired()
                                ? "bg-destructive/5 border-destructive/20 text-destructive"
                                : isClosingSoon()
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/60 border-border text-foreground"
                        )}
                    >
                        <ClockIcon className="w-3 h-3" aria-hidden="true" />
                        {isExpired()
                            ? 'Expired'
                            : isClosingSoon()
                                ? `Expires in ${Math.max(0, daysToExpiry() || 0)}d`
                                : `Apply by ${formatExpiryDate()}`}
                    </span>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-border/40">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location</p>
                    <div className="flex items-center gap-2 text-foreground/90 text-[14px] font-semibold min-w-0">
                        <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                        <span className="truncate whitespace-nowrap">{getLocationLabel()}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Salary</p>
                    <div className="flex items-center gap-2 text-foreground/90 text-[14px] font-semibold min-w-0">
                        <CurrencyRupeeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                        <span className="truncate whitespace-nowrap">{isDrive ? driveMeta.maxCtcLabel : formatSalary()}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-auto">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
                        <span>Verified</span>
                    </div>
                    {isApplied && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold border border-primary/20 uppercase">
                            Applied
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-primary text-[11px] font-bold uppercase tracking-widest group-hover:translate-x-0.5 transition-transform duration-300">
                    <span>{isApplied ? 'View Status' : (isDrive ? 'Apply via TCS Portal' : 'Apply Now')}</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
            </div>

            {/* Admin Edit Shortcut */}
            {isAdmin && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/admin/opportunities/edit/${job.slug || job.id}`;
                    }}
                    className="absolute -top-2 -right-2 p-2 rounded-full bg-card border border-border shadow-lg text-primary hover:bg-primary/10 transition-colors z-20"
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



