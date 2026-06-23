import { ActionType, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { Button } from '@/ui/Button';
import Link from 'next/link';
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
    formatDeadline,
}: DetailSidebarActionsProps) {
    const locationsGrouped = getGroupedLocations(opp.locations);

    return (
        <div className="space-y-4">
            {opp.type === 'WALKIN' && (
                <div className="hidden lg:block bg-muted/30 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-primary">Walk-in snapshot</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground">Date & Time</p>
                            <p className="text-foreground font-semibold">
                                {opp.walkInDetails?.dateRange} {opp.walkInDetails?.timeRange ? `• ${opp.walkInDetails.timeRange}` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground">Venue</p>
                            <p className="text-foreground">{opp.walkInDetails?.venueAddress}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Job Overview Card */}
            <div className="hidden lg:block bg-muted/30 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-foreground pb-2.5 border-b border-border/40">Job Overview</h4>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <BriefcaseIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Experience</p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                                {opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <UsersIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Employment</p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                                {formatEmploymentText(opp.employmentType)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Role Title</p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                                {opp.jobFunction || 'General'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CurrencyRupeeIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Salary</p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                                {opp.salaryMax ? `₹${opp.salaryMin} - ₹${opp.salaryMax}` : 'Competitive'}
                            </p>
                        </div>
                    </div>
                    {opp.postedAt && (
                        <div className="flex items-start gap-3">
                            <ClockIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Date Posted</p>
                                <p className="text-sm font-semibold text-foreground mt-1">
                                    {new Date(opp.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}
                    {opp.expiresAt && (
                        <div className="flex items-start gap-3">
                            <CalendarIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Application Deadline</p>
                                <p className="text-sm font-semibold text-foreground mt-1">
                                    {formatDeadline(opp)}
                                </p>
                            </div>
                        </div>
                    )}
                    {locationsGrouped.length > 0 && (
                        <div className="flex items-start gap-3">
                            <MapPinIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Locations</p>
                                <p className="text-sm font-semibold text-foreground mt-1 leading-snug">
                                    {locationsGrouped.join(' • ')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Tracker Card */}
            {((user) || (hasApplyLink && isCampusDrive && timelineEvents.length > 0)) && (
                <div className="bg-muted/30 p-5 rounded-2xl space-y-3">
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
                                                    "h-8 rounded-lg border text-xs font-bold transition-all",
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

                        {hasApplyLink && isCampusDrive && timelineEvents.length > 0 && (
                            <button
                                onClick={jumpToTimeline}
                                className="w-full h-10 rounded-lg border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-bold"
                            >
                                Track Updates
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Admin Control Card */}
            {user?.role === 'ADMIN' && (
                <div className="bg-muted/30 p-5 border border-primary/25 rounded-2xl space-y-2">
                    <h4 className="text-sm font-bold text-primary">Admin Control</h4>
                    <Link href={`/opportunities/edit/${opp.id}`} className="block">
                        <Button variant="outline" className="w-full text-xs font-bold h-8 hover:bg-primary/5">
                            Edit Opportunity
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
