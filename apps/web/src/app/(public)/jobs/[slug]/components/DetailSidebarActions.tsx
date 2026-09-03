import { ActionType, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { Button } from '@/ui/Button';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import Link from 'next/link';
import { CopyButton } from '@/ui/CopyButton';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import { getGroupedLocations } from '@/features/opportunities/domain/opportunityDisplay';

function formatEmploymentText(text: string | null | undefined): string {
    if (!text) return 'Not specified';
    const formatted = text.replace(/_/g, ' ');
    return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

interface DetailSidebarActionsProps {
    user: User | null;
    opp: Opportunity;
    currentAction: ActionType | null;
    trackerOptions: { key: ActionType; label: string }[];
    isUpdatingAction: boolean;
    handleSetAction: (actionType: ActionType) => void;
    hasApplyLink: boolean;
    isCampusDrive: boolean;
    timelineEvents: OpportunityEvent[];
    jumpToTimeline: () => void;
    loginFromDetailHref: string;
    listingState: string;
    formatDeadline: (opp: Opportunity) => string | null;
    isMobile?: boolean;
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
    handleCopyLink: () => void;
}

export function DetailSidebarActions({
    user,
    opp,
    currentAction,
    trackerOptions,
    isUpdatingAction,
    handleSetAction,
    hasApplyLink,
    isCampusDrive,
    timelineEvents,
    jumpToTimeline,
    listingState,
    formatDeadline,
    handleApply,
    handleToggleSave,
    handleShare,
}: DetailSidebarActionsProps) {
    const locationsGrouped = getGroupedLocations(opp.locations);
    const hasSalary = !!opp.salaryMax;
    const salaryText = hasSalary ? `₹${opp.salaryMin} – ₹${opp.salaryMax}` : null;
    const experience = opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax} yrs` : 'Fresher';

    return (
        <div className="space-y-4">
            {/* ── CTA Row: Apply + Save ── */}
            <div className="flex gap-2">
                {hasApplyLink && listingState !== 'EXPIRED' ? (
                    <Button
                        onClick={handleApply}
                        className="flex-1 h-10 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                        Apply
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    </Button>
                ) : hasApplyLink && listingState === 'EXPIRED' ? (
                    <div className="flex-1 h-10 rounded-lg border border-muted bg-muted/50 flex items-center justify-center gap-1.5 text-muted-foreground text-sm font-semibold cursor-not-allowed select-none">
                        Closed
                    </div>
                ) : null}
                <button
                    onClick={handleToggleSave}
                    className={cn(
                        "h-10 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-sm font-semibold transition-all shrink-0",
                        opp.isSaved
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                >
                    {opp.isSaved ? <BookmarkSolidIcon className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
                    {opp.isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                    onClick={handleShare}
                    className="h-10 w-10 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-all shrink-0"
                    title="Share"
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
                <CopyButton
                    variant="ghost"
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    icon={LinkIcon}
                    iconClassName="w-4 h-4"
                    className="h-10 w-10 !p-0 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-all shrink-0"
                />
            </div>

            {/* ── Key Facts ── */}
            <div className="space-y-2.5">
                {hasSalary && (
                    <div className="flex items-center gap-2.5">
                        <CurrencyRupeeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{salaryText}</span>
                        <span className="text-xs text-muted-foreground">/yr</span>
                    </div>
                )}
                <div className="flex items-center gap-2.5">
                    <BriefcaseIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{experience}</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <UsersIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{formatEmploymentText(opp.employmentType)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <ShieldCheckIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{opp.jobFunction || 'General'}</span>
                </div>
                {locationsGrouped.length > 0 && (
                    <div className="flex items-center gap-2.5">
                        <MapPinIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground leading-snug">{locationsGrouped.join(', ')}</span>
                    </div>
                )}
                {opp.postedAt && (
                    <div className="flex items-center gap-2.5">
                        <ClockIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">
                            {new Date(opp.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                )}
                {opp.expiresAt && (
                    <div className="flex items-center gap-2.5">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{formatDeadline(opp)}</span>
                    </div>
                )}
            </div>

            {/* ── Campus Drive ── */}
            {isCampusDrive && timelineEvents.length > 0 && (
                <button
                    onClick={jumpToTimeline}
                    className="w-full h-9 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-semibold"
                >
                    View drive timeline
                </button>
            )}

            {/* ── Status (logged-in users only) ── */}
            {user && trackerOptions.length > 0 && (
                <div className="pt-3 border-t border-border/40 space-y-2">
                    {!currentAction && (
                        <p className="text-xs text-muted-foreground">Mark your status:</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {trackerOptions.map((option) => {
                            const isActive = currentAction === option.key;
                            return (
                                <button
                                    key={option.key}
                                    onClick={() => handleSetAction(option.key)}
                                    disabled={isUpdatingAction}
                                    className={cn(
                                        "h-7 px-3 rounded-full text-xs font-medium transition-all",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                        isUpdatingAction && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isActive && "✓ "}{option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Submit a job ── */}
            <div className="pt-3 border-t border-border/40">
                <Link
                    href="/submit"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span className="w-4 h-4 rounded border border-dashed border-current flex items-center justify-center text-[10px] leading-none">+</span>
                    Know about a job opening? Submit it
                </Link>
            </div>

            {/* ── Admin ── */}
            {user?.role === 'ADMIN' && (
                <div className="pt-3 border-t border-border/40">
                    <Link href={`/opportunities/edit/${opp.id}`} className="block">
                        <Button variant="outline" className="w-full text-xs font-semibold h-8">
                            Edit
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
