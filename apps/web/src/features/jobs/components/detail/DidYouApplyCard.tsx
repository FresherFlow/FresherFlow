'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ActionType } from '@fresherflow/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { BrandButton } from '@/ui/BrandButton';
import { clearPendingAction, peekPendingAction, subscribeToPendingAction } from '@/lib/storage/pendingAction';

const TRACKER_PATH = '/tracker';

type DidYouApplyCardProps = {
    jobId: string;
    jobTitle: string;
    company: string;
    /** `handleSetAction` from `useOpportunityDetail` — the real tracker write. */
    setAction: (actionType: ActionType) => void;
    isUpdatingAction?: boolean;
};

/**
 * Post-apply confirmation. Render it unconditionally on the job page: the card
 * decides for itself whether an answer is outstanding, so the caller never has
 * to thread "did they click Apply" through its own state.
 */
export function DidYouApplyCard({ jobId, jobTitle, company, setAction, isUpdatingAction = false }: DidYouApplyCardProps) {
    const [isAwaitingAnswer, setIsAwaitingAnswer] = useState(false);
    const headingId = useId();

    // Subscribe, do not read once. Apply happens on THIS page — no navigation,
    // so the flag is set after mount and a mount-only read could never see it.
    // That is why the card never appeared without a manual reload. The parent
    // drains the slot via `takePendingAction` for guest-save replay, which also
    // broadcasts, so both consumers stay in step.
    useEffect(() => {
        const read = () => {
            const stored = peekPendingAction();
            setIsAwaitingAnswer(stored?.type === 'awaiting-apply-confirmation' && stored.jobId === jobId);
        };
        read();
        return subscribeToPendingAction(read);
    }, [jobId]);

    const answer = useCallback(
        (applied: boolean) => {
            // Clear first: the card must never re-arm itself on a re-render,
            // and "Not yet" is a dismissal, not a tracker write.
            clearPendingAction();
            setIsAwaitingAnswer(false);
            if (applied) setAction(ActionType.APPLIED);
        },
        [setAction]
    );

    if (!isAwaitingAnswer) return null;

    return (
        <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs font-bold uppercase tracking-widest text-ff-accent">
                    Track this application
                </p>
                <button
                    type="button"
                    onClick={() => answer(false)}
                    aria-label="Dismiss"
                    className="-mr-1 -mt-1 shrink-0 rounded-xs p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <XMarkIcon aria-hidden className="h-4 w-4" />
                </button>
            </div>

            <h3 id={headingId} className="mt-3 text-xl font-bold tracking-tight text-foreground">
                Did you apply?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {jobTitle} at {company}. Confirm so you can track status on FresherFlow.
            </p>

            <div className="mt-5 space-y-2.5">
                <BrandButton
                    variant="solid"
                    className="w-full"
                    disabled={isUpdatingAction}
                    onClick={() => answer(true)}
                >
                    Yes, I applied
                </BrandButton>
                <BrandButton
                    variant="outline"
                    className="w-full"
                    disabled={isUpdatingAction}
                    onClick={() => answer(false)}
                >
                    Not yet
                </BrandButton>
            </div>

            <div className="mt-4 text-center">
                <Link
                    href={TRACKER_PATH}
                    className="text-xs font-semibold text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                >
                    Open Application Tracker
                </Link>
            </div>
        </section>
    );
}
