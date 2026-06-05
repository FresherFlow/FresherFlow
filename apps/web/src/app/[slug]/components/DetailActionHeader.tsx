import { type Opportunity, type User } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/ui/cn';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import FlagIcon from '@heroicons/react/24/outline/FlagIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';

interface DetailActionHeaderProps {
    user: User | null;
    opp: Opportunity;
    router: ReturnType<typeof useRouter>;
    handleShare: () => void;
    handleCopyLink: () => void;
    showReports: boolean;
    setShowReports: (show: boolean) => void;
    reportMenuRef: React.RefObject<HTMLDivElement | null>;
    handleReport: (reason: string) => void;
}

export function DetailActionHeader({
    user,
    opp,
    router,
    handleShare,
    handleCopyLink,
    showReports,
    setShowReports,
    reportMenuRef,
    handleReport
}: DetailActionHeaderProps) {
    if (!user) return null;

    return (
        <div className="flex items-center justify-between">
            <button
                onClick={() => (window.history.length > 1 ? router.back() : router.push('/opportunities'))}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/30 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
            </button>

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
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-muted rounded-lg text-xs font-bold text-foreground uppercase tracking-tight transition-all text-left group"
                                >
                                    <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
