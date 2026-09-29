'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { communityApi } from '@/features/jobs/api/community';
import { JobSignalType } from '@fresherflow/types';
import type { SignalState } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const SIGNALS: { key: JobSignalType; label: string }[] = [
    { key: JobSignalType.APPLIED, label: 'Applied' },
    { key: JobSignalType.INTERVIEWED, label: 'Interviewed' },
    { key: JobSignalType.OFFER, label: 'Got offer' },
    { key: JobSignalType.CLOSED, label: 'Closed' },
    { key: JobSignalType.HELPFUL, label: 'Helpful' },
    { key: JobSignalType.INCORRECT, label: 'Incorrect' },
];

/* Applied / Interviewed / Got offer / Closed were rendered here as a second
   row of pills. The sidebar already owns that state ("Mark your status"), and
   two places to mark the same thing is how they drifted apart. This panel is
   now only a claim about the listing itself, which nobody else collects. */
const ACCURACY_KEYS: JobSignalType[] = [JobSignalType.HELPFUL, JobSignalType.INCORRECT];

const EMPTY_SUMMARY: Record<JobSignalType, number> = {
    [JobSignalType.APPLIED]: 0,
    [JobSignalType.INTERVIEWED]: 0,
    [JobSignalType.OFFER]: 0,
    [JobSignalType.CLOSED]: 0,
    [JobSignalType.HELPFUL]: 0,
    [JobSignalType.INCORRECT]: 0,
};

type Props = {
    opportunityIdOrSlug: string;
};

export function SignalsPanel({ opportunityIdOrSlug }: Props) {
    const router = useRouter();
    const { user } = useAuth();
    const [state, setState] = useState<SignalState | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        try {
            setError(false);
            const result = await communityApi.getSignals(opportunityIdOrSlug);
            setState(result);
        } catch {
            setError(true);
        }
    }, [opportunityIdOrSlug]);

    useEffect(() => {
        void load();
    }, [load]);

    const summary = state?.summary ?? EMPTY_SUMMARY;
    const mySignals = state?.mySignals ?? [];

    const toggle = async (signalType: JobSignalType) => {
        if (!user) {
            router.push(`/login?next=${encodeURIComponent(`/jobs/${opportunityIdOrSlug}`)}`);
            return;
        }
        if (busy) return;

        const isOn = mySignals.includes(signalType);
        // Optimistic update
        setState(prev => {
            const base = prev ?? { summary: { ...EMPTY_SUMMARY }, mySignals: [] };
            return {
                summary: {
                    ...base.summary,
                    [signalType]: Math.max(0, (base.summary[signalType] ?? 0) + (isOn ? -1 : 1)),
                },
                mySignals: isOn
                    ? base.mySignals.filter(s => s !== signalType)
                    : [...base.mySignals, signalType],
            };
        });

        setBusy(true);
        try {
            const result = await communityApi.toggleSignal(opportunityIdOrSlug, signalType);
            setState(result);
        } catch {
            void load();
        } finally {
            setBusy(false);
        }
    };

    const renderGroup = (keys: JobSignalType[]) =>
        keys.map(key => {
            const signal = SIGNALS.find(s => s.key === key);
            if (!signal) return null;
            const isOn = mySignals.includes(key);
            const count = summary[key] ?? 0;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => void toggle(key)}
                    disabled={busy}
                    aria-pressed={isOn}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        isOn
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40',
                        busy && 'opacity-60'
                    )}
                >
                    {signal.label}
                    {count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
                </button>
            );
        });

    return (
        <section aria-label="Listing accuracy" className="space-y-2">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Is this listing right?</h3>
            <div className="flex flex-wrap gap-2">{renderGroup(ACCURACY_KEYS)}</div>
            {/* A failed read says so instead of rendering zero-count pills that
                read as real data. */}
            {error && (
                <p className="text-xs text-muted-foreground">
                    Could not load signals.{' '}
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="font-semibold text-primary hover:underline"
                    >
                        Retry
                    </button>
                </p>
            )}
        </section>
    );
}
