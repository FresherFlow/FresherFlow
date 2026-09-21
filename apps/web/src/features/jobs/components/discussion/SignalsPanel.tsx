'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { communityApi } from '@fresherflow/api-client';
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

    return (
        <section aria-label="Community signals" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground tracking-tight">Community signals</h3>
                {error && (
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="text-xs font-semibold text-primary hover:underline"
                    >
                        Retry
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {SIGNALS.map(signal => {
                    const isOn = mySignals.includes(signal.key);
                    const count = summary[signal.key] ?? 0;
                    return (
                        <button
                            key={signal.key}
                            type="button"
                            onClick={() => void toggle(signal.key)}
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
                })}
            </div>
        </section>
    );
}
