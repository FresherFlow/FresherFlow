import { ActionType, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/components/ui/Button';
// removed bookmark icons
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import Link from 'next/link';

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
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
    handleCopyLink: () => void;
    loginFromDetailHref: string;
    listingState: string;
    formatDeadline: (opp: Opportunity) => string | null;
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
    handleApply,
    handleShare,
    handleCopyLink,
    listingState,
    formatDeadline
}: DetailSidebarActionsProps) {
    return (
        <div className="space-y-4">
            {opp.type === 'WALKIN' && (
                <div className="hidden lg:block bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Walk-in snapshot</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date & Time</p>
                            <p className="text-foreground font-semibold">
                                {opp.walkInDetails?.dateRange} {opp.walkInDetails?.timeRange ? `• ${opp.walkInDetails.timeRange}` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Venue</p>
                            <p className="text-foreground">{opp.walkInDetails?.venueAddress}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Eligibility Card is usually handled outside this but could be inside */}
            
            <div className="hidden lg:block bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Listing Status</h4>
                    {listingState === 'EXPIRED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-destructive/20 bg-destructive/5 text-destructive text-xs font-bold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-destructive" />
                            Expired
                        </span>
                    ) : listingState === 'CLOSING_SOON' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Closing Soon
                        </span>
                    ) : listingState === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/20 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/70" />
                            {listingState}
                        </span>
                    )}
                </div>
                <div className="space-y-2.5">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                        {listingState === 'EXPIRED'
                            ? 'This listing is expired. You can review details, but new applications are usually closed.'
                            : listingState === 'CLOSING_SOON'
                                ? 'This listing is closing soon. Apply before the deadline to be considered.'
                                : listingState !== 'ACTIVE'
                                    ? `This listing is marked as ${listingState.toLowerCase()}. Check status updates from the source before applying.`
                                    : 'This listing is currently active and accepting applications.'}
                    </p>

                    {opp.expiresAt && (
                        <p className="text-sm text-muted-foreground">
                            Deadline: <span className="font-semibold text-foreground">{formatDeadline(opp)}</span>
                        </p>
                    )}
                </div>
            </div>

            <div className="hidden lg:flex p-3.5 items-start gap-3 bg-muted/10 border border-border border-dashed rounded-xl">
                <InformationCircleIcon className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium text-foreground/80 leading-relaxed">
                    Fraud protection: We never charge for placement. Report suspicious activity.
                </p>
            </div>

            <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                <div className="space-y-3">
                    {user && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
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
                                                "h-8 rounded-lg border text-xs font-bold uppercase tracking-tight transition-all",
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
                            {isCampusDrive && timelineEvents.length > 0 && (
                                <button
                                    onClick={jumpToTimeline}
                                    className="w-full h-10 rounded-lg border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-bold uppercase tracking-widest"
                                >
                                    Track Updates
                                </button>
                            )}
                            {listingState === 'EXPIRED' ? (
                                <div className="w-full h-12 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-center gap-2 text-destructive text-sm font-bold uppercase tracking-tight cursor-not-allowed select-none">
                                    <span className="w-2 h-2 rounded-full bg-destructive" />
                                    Applications Closed
                                </div>
                            ) : (
                                <Button
                                    onClick={handleApply}
                                    className="w-full h-12 text-base bg-primary/70 text-primary-foreground border border-primary/60 hover:bg-primary/80 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-tight shadow-lg hover:shadow-xl transition-all"
                                >
                                    Apply Now
                                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    )}
                    {/* Share & Copy Link row */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center gap-2 h-10 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-primary transition-all text-xs font-bold uppercase tracking-wide"
                        >
                            <ShareIcon className="w-4 h-4" />
                            Share
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center justify-center gap-2 h-10 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-primary transition-all text-xs font-bold uppercase tracking-wide"
                        >
                            <LinkIcon className="w-4 h-4" />
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>

            {user?.role === 'ADMIN' && (
                <div className="bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                    <h4 className="text-sm font-bold text-primary">Admin Control</h4>
                    <Link href={`/opportunities/edit/${opp.id}`} className="block">
                        <Button variant="outline" className="w-full text-xs font-bold uppercase h-8 hover:bg-primary/5">
                            Edit Opportunity
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
