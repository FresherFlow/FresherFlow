'use client';

import { useEffect, useState } from 'react';
import { communityApi } from '@fresherflow/api-client';
import { JobSignalType } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

/** Declared order, so the strip reads the same way on every opening. */
const SIGNAL_ORDER: JobSignalType[] = [
    JobSignalType.APPLIED,
    JobSignalType.INTERVIEWED,
    JobSignalType.OFFER,
    JobSignalType.CLOSED,
    JobSignalType.HELPFUL,
    JobSignalType.INCORRECT,
];

/** Signal colour language (plan 17 §17.3): live / heat / dead / aging. */
const SIGNAL_COPY: Record<JobSignalType, { label: string; verb: string; dot: string }> = {
    [JobSignalType.APPLIED]: { label: 'applied', verb: 'applied here', dot: 'bg-signal-live' },
    [JobSignalType.INTERVIEWED]: { label: 'interviewed', verb: 'reached interview', dot: 'bg-signal-heat' },
    [JobSignalType.OFFER]: { label: 'offers', verb: 'got an offer', dot: 'bg-signal-live' },
    [JobSignalType.CLOSED]: { label: 'closed', verb: 'reported it closed', dot: 'bg-signal-dead' },
    [JobSignalType.HELPFUL]: { label: 'helpful', verb: 'found it helpful', dot: 'bg-signal-heat' },
    [JobSignalType.INCORRECT]: { label: 'incorrect', verb: 'flagged it incorrect', dot: 'bg-signal-aging' },
};

/**
 * The hero's live signal strip (plan 16 §16.2, §16.8).
 *
 * Reads the real aggregate signal counts from the community API on the client,
 * so nothing per-viewer leaks into the cached page. Counts that do not exist
 * are never rendered as zeros (plan 19 §19.4.3): with no signals it shows one
 * honest line instead of a row of empty chips.
 */
export function HeroSignalStrip({ opportunityId }: { opportunityId: string }) {
    const [signals, setSignals] = useState<Partial<Record<JobSignalType, number>> | null>(null);
    const [note, setNote] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const state = await communityApi.getSignals(opportunityId);
                if (cancelled) return;
                setSignals(state.summary);

                const total = Object.values(state.summary).reduce((sum, count) => sum + count, 0);
                if (total > 0) {
                    const { comments } = await communityApi.listComments(opportunityId);
                    if (!cancelled && comments.length > 0) {
                        setNote(comments[0].text);
                    }
                }
            } catch {
                // Signals are an enhancement: a failed read leaves the honest line.
                if (!cancelled) setSignals({});
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [opportunityId]);

    const present = signals
        ? SIGNAL_ORDER.filter((type) => (signals[type] ?? 0) > 0)
        : [];

    if (present.length === 0) {
        return (
            <p className="font-record text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Be the first to confirm this opening
            </p>
        );
    }

    return (
        <TooltipProvider delayDuration={150}>
            <ul className="flex flex-wrap items-center gap-1.5">
                {present.map((type) => {
                    const count = signals?.[type] ?? 0;
                    const copy = SIGNAL_COPY[type];
                    return (
                        <li key={type}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-1 font-record text-[11px] tabular-nums text-foreground cursor-help">
                                        <span className={cn('h-1.5 w-1.5 rounded-full', copy.dot)} />
                                        {count} {copy.label}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    <span>
                                        {count} freshers {copy.verb}
                                    </span>
                                    {note ? (
                                        <span className="mt-1 block text-muted-foreground">&quot;{note}&quot;</span>
                                    ) : null}
                                </TooltipContent>
                            </Tooltip>
                        </li>
                    );
                })}
            </ul>
        </TooltipProvider>
    );
}
