'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { Button } from '@/ui/Button';
import {
    groupWalkinsByDate,
    WALKIN_BUCKETS,
} from '@/features/jobs/utils/walkinEventUtils';
import { WalkinDateChip } from '@/features/jobs/components/WalkinEventWidgets';
import { cn } from '@repo/ui/utils/cn';

/**
 * Walk-in date-grouped board — "This Saturday near me" view.
 *
 * Sits above the standard feed as topContent. Each bucket is a horizontal
 * scroller of compact drive cards; the full feed below remains untouched so
 * every existing layer (filters, split view, map) keeps working.
 *
 * Design rules: semantic tokens, ui/ primitives, 150ms press feedback,
 * motion-reduce safe.
 */

const INITIAL_BUCKETS = 3;

export function WalkinEventBoard({ opportunities }: { opportunities: Opportunity[] }) {
    const [expanded, setExpanded] = useState(false);

    const groups = useMemo(() => {
        // Newest-posted ascending is meaningless here; sort by next date so
        // buckets read chronologically left-to-right.
        const sorted = [...opportunities].sort((a, b) => {
            const da = a.walkInDetails?.dates?.[0] ? new Date(a.walkInDetails.dates[0]).getTime() : Infinity;
            const db = b.walkInDetails?.dates?.[0] ? new Date(b.walkInDetails.dates[0]).getTime() : Infinity;
            return da - db;
        });
        return groupWalkinsByDate(sorted);
    }, [opportunities]);

    if (groups.length === 0) return null;

    const visibleGroups = expanded ? groups : groups.slice(0, INITIAL_BUCKETS);

    return (
        <section aria-label="Walk-in drives by date" className="space-y-4">
            {visibleGroups.map(({ bucket, items }) => (
                <div key={bucket.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h2
                            className={cn(
                                'text-sm font-bold tracking-tight',
                                bucket.key === 'today' ? 'text-destructive' : 'text-foreground'
                            )}
                        >
                            {bucket.label}
                        </h2>
                        <span className="text-xs font-medium text-muted-foreground">
                            {items.length} drive{items.length === 1 ? '' : 's'}
                        </span>
                        <div className="flex-1 h-px bg-border/60" />
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {items.map((opp) => (
                            <Link
                                key={`${bucket.key}-${opp.id}`}
                                href={`/jobs/${opp.slug}`}
                                className="snap-start shrink-0 w-60 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-1.5 group active-press-soft duration-150 ease-out motion-reduce:transform-none"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {opp.normalizedRole || opp.title}
                                    </span>
                                    <WalkinDateChip opp={opp} />
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground truncate">{opp.company}</span>
                                {opp.walkInDetails?.venueAddress && (
                                    <span className="text-xs text-muted-foreground truncate">
                                         {opp.walkInDetails.landmark || opp.walkInDetails.venueAddress}
                                    </span>
                                )}
                                {(opp.walkInDetails?.timeRange || opp.walkInDetails?.reportingTime) && (
                                    <span className="text-xs text-muted-foreground">
                                         {opp.walkInDetails.timeRange || opp.walkInDetails.reportingTime}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            ))}

            {groups.length > INITIAL_BUCKETS && (
                <div className="flex justify-center pt-0.5">
                    <Button variant="ghost" size="sm" onClick={() => setExpanded((p) => !p)}>
                        {expanded ? 'Show fewer dates' : `Show all dates (${groups.length})`}
                    </Button>
                </div>
            )}
        </section>
    );
}
