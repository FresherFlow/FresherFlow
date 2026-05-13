import { Opportunity, User } from '@fresherflow/types';
import { Button } from '@/components/ui/Button';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { cn } from '@/shared/ui/cn';

interface GovernmentStickyActionBarProps {
    user: User | null;
    opp: Opportunity;
    hasApplyLink: boolean;
    handleApply: () => void;
    handleToggleSave: () => void;
    loginFromDetailHref: string;
}

export function GovernmentStickyActionBar({
    user,
    opp,
    hasApplyLink,
    handleApply,
    handleToggleSave,
    loginFromDetailHref,
}: GovernmentStickyActionBarProps) {
    return (
        <div className="sticky bottom-4 z-40">
            <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h4 className="text-base font-bold tracking-tight text-slate-950">Ready to apply?</h4>
                        <p className="text-sm text-slate-600">Verify official notice, fee details, and document checklist before final submission.</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            onClick={handleToggleSave}
                            className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all",
                                opp.isSaved
                                    ? "border-blue-200 bg-blue-50 text-blue-800"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            {opp.isSaved ? <BookmarkSolidIcon className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />}
                            {opp.isSaved ? 'Saved' : 'Save'}
                        </button>
                        {hasApplyLink ? (
                            <Button
                                onClick={handleApply}
                                className="inline-flex h-auto items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0f4ca3_0%,#1e67c7_100%)] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-900/15 hover:opacity-95"
                            >
                                Apply Now
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Link href={loginFromDetailHref}>
                                <Button className="rounded-xl px-6 py-3 text-sm font-extrabold uppercase tracking-[0.12em]">
                                    Sign in to continue
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
                {!user && (
                    <p className="mt-3 text-xs text-slate-500">
                        Sign in to save this job and track application progress.
                    </p>
                )}
            </div>
        </div>
    );
}
