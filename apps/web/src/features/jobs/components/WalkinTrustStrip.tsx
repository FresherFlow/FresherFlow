'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { SignalState } from '@fresherflow/types';
import { JobSignalType } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { Skeleton } from '@/ui/Skeleton';
import { cn } from '@repo/ui/utils/cn';

/**
 * WalkinTrustStrip — the "is this drive real?" answer, inline.
 *
 * Compact read-mostly view of community signals for a walk-in, plus a link
 * into the full discussion. Designed for the split-view detail pane where the
 * full DiscussionSection would be too heavy; the full detail page keeps its
 * complete section.
 *
 * Signals shown for walk-ins: Attended (INTERVIEWED), Offer, Closed, Incorrect.
 */

const COMPACT_SIGNALS: { key: JobSignalType; label: string; tone: 'positive' | 'negative' }[] = [
    { key: JobSignalType.INTERVIEWED, label: 'Attended', tone: 'positive' },
    { key: JobSignalType.OFFER, label: 'Offers', tone: 'positive' },
    { key: JobSignalType.CLOSED, label: 'Closed early', tone: 'negative' },
    { key: JobSignalType.INCORRECT, label: 'Fake?', tone: 'negative' },
];

export function WalkinTrustStrip({ opportunityIdOrSlug }: { opportunityIdOrSlug: string }) {
    const { user } = useAuth();
    const [state, setState] = useState<SignalState | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        communityApi
            .getSignals(opportunityIdOrSlug)
            .then((result) => {
                if (!cancelled) setState(result);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [opportunityIdOrSlug]);

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton variant="pill" className="h-7 w-24" />
                <Skeleton variant="pill" className="h-7 w-20" />
                <Skeleton variant="pill" className="h-7 w-24" />
            </div>
        );
    }

    if (failed || !state) return null; // silent — trust data is additive, never blocks the drive info

    const summary = state.summary;

    const totalPositive =
        (summary[JobSignalType.INTERVIEWED] ?? 0) + (summary[JobSignalType.OFFER] ?? 0);
    const totalNegative =
        (summary[JobSignalType.CLOSED] ?? 0) + (summary[JobSignalType.INCORRECT] ?? 0);
    const hasAnything =
        totalPositive + totalNegative + (summary[JobSignalType.APPLIED] ?? 0) > 0;

    const href = `/jobs/${opportunityIdOrSlug}`;

    return (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Community check
                </span>
                {hasAnything ? (
                    <span className={cn(
                        'text-xs font-bold',
                        totalNegative > totalPositive ? 'text-destructive' : 'text-success'
                    )}>
                        {totalNegative > totalPositive
                            ? 'Mixed reports'
                            : totalPositive > 0
                                ? 'Confirmed real'
                                : null}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">No reports yet</span>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5">
                {COMPACT_SIGNALS.map(({ key, label, tone }) => {
                    const count = summary[key] ?? 0;
                    const isMine = state.mySignals.includes(key);
                    return (
                        <span
                            key={key}
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                count === 0
                                    ? 'border-border/60 bg-background text-muted-foreground'
                                    : tone === 'positive'
                                        ? 'border-success/25 bg-success/10 text-success'
                                        : 'border-destructive/25 bg-destructive/10 text-destructive',
                                isMine && 'ring-1 ring-primary/40'
                            )}
                        >
                            {label}
                            <span className="tabular-nums">{count}</span>
                        </span>
                    );
                })}
            </div>

            {!user && (
                <p className="text-xs text-muted-foreground">
                    Attended this drive?{' '}
                    <Link href={`/login?next=${encodeURIComponent(href)}`} className="font-semibold text-primary hover:underline">
                        Sign in to report
                    </Link>{' '}
                    ·{' '}
                    <Link href={href} className="font-semibold text-primary hover:underline">
                        Full discussion →
                    </Link>
                </p>
            )}
        </div>
    );
}
