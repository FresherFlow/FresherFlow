import { type Opportunity, type User } from '@fresherflow/types';
import { TimelineEventView } from '../detailUtils';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';

interface DetailActionMobileProps {
    user: User | null;
    opp: Opportunity;
    isCampusDrive: boolean;
    timelineEvents: TimelineEventView[];
    hasApplyLink: boolean;
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
    handleCopyLink: () => void;
    jumpToTimeline: () => void;
    loginFromDetailHref: string;
    router: ReturnType<typeof useRouter>;
}

export function DetailActionMobile({
    user,
    opp,
    isCampusDrive,
    timelineEvents,
    hasApplyLink,
    handleApply,
    handleToggleSave,
    handleShare,
    handleCopyLink,
    jumpToTimeline,
    loginFromDetailHref,
    router
}: DetailActionMobileProps) {
    return (
        <div className="lg:hidden bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
            {isCampusDrive && timelineEvents.length > 0 && (
                <button
                    onClick={jumpToTimeline}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-lg border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-bold uppercase tracking-wide"
                >
                    <ClockIcon className="w-4 h-4" />
                    Track Updates
                </button>
            )}
            {hasApplyLink && (
                <Button
                    onClick={handleApply}
                    className="w-full h-12 text-sm bg-primary/70 text-primary-foreground border border-primary/60 hover:bg-primary/80 rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-wide shadow-md"
                >
                    Apply Now
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </Button>
            )}

            {user ? (
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
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}
