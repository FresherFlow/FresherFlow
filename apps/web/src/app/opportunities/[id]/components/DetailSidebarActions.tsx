import { ActionType, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/components/ui/Button';
// removed bookmark icons
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
// removed unused ClockIcon import
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
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
    handleToggleSave,
    loginFromDetailHref,
    listingState,
    formatDeadline
}: DetailSidebarActionsProps) {
    return (
        <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
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
            
            <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                <div className="space-y-3">
                    {user && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
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
                            <Button
                                onClick={handleApply}
                                className="w-full h-12 text-base bg-primary/70 text-primary-foreground border border-primary/60 hover:bg-primary/80 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-tight shadow-lg hover:shadow-xl transition-all"
                            >
                                Apply Now
                                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                            </Button>
                        </div>
                    )}

                    {/* Save button and track note hidden */}
                </div>

                <div className="pt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground/90 uppercase">Listing Verified</span>
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-primary/40" />
                </div>
            </div>

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
                            : listingState !== 'ACTIVE' && listingState !== 'CLOSING_SOON'
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
                <InformationCircleIcon className="w-4 h-4 text-primary/40 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-tight">
                    Fraud protection: We never charge for placement. Report suspicious activity.
                </p>
            </div>

            {user?.role === 'ADMIN' && (
                <div className="bg-card p-4 border border-primary/20 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-tight text-primary">Admin Control</h4>
                    <Link href={`/opportunities/edit/${opp.id}`} className="block">
                        <Button variant="outline" className="w-full text-xs font-bold uppercase h-8 hover:bg-primary/5">
                            Edit Opportunity
                        </Button>
                    </Link>
                </div>
            )}
        </aside>
    );
}
