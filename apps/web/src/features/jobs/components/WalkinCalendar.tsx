'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import {
    getWalkinDates,
    WALKIN_BUCKETS,
    type WalkinDateBucket,
} from '@/features/jobs/utils/walkinEventUtils';
import { cn } from '@repo/ui/utils/cn';

/**
 * Walk-in Calendar — month grid of drive dates.
 *
 * A separate view layer for the same feed data: every drive date becomes a
 * calendar cell entry. Users think "what's happening this Saturday", this
 * answers it without scrolling a list.
 *
 * Layering rules: semantic tokens only; composed of ui/ primitives; links use
 * the standard opportunity path; no map or pane interference.
 */

interface CalendarDrive {
    opp: Opportunity;
    date: Date;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** 6x7 grid of day cells for the visible month (leading/trailing days included). */
function buildMonthCells(viewMonth: Date): Date[] {
    const first = startOfMonth(viewMonth);
    const startDow = first.getDay(); // 0 = Sunday
    const cells: Date[] = [];
    const start = new Date(first);
    start.setDate(first.getDate() - startDow);
    for (let i = 0; i < 42; i += 1) {
        cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return cells;
}

function bucketForDate(date: Date): WalkinDateBucket['key'] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const t = date.getTime();
    if (t < todayStart + 86_400_000) return 'today';
    if (t < todayStart + 2 * 86_400_000) return 'tomorrow';
    const dayDiff = Math.round((t - todayStart) / 86_400_000);
    const dow = date.getDay();
    if (dayDiff < 7 && (dow === 0 || dow === 6)) return 'thisWeekend';
    if (dayDiff < 7) return 'thisWeek';
    return 'later';
}

const BUCKET_STYLES: Record<WalkinDateBucket['key'], string> = {
    today: 'bg-destructive text-destructive-foreground',
    tomorrow: 'bg-warning text-warning-foreground',
    thisWeekend: 'bg-primary text-primary-foreground',
    thisWeek: 'bg-primary/80 text-primary-foreground',
    later: 'bg-primary text-primary-foreground',
};

export function WalkinCalendar({
    opportunities,
    loading,
    error,
    onRetry,
}: {
    opportunities: Opportunity[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}) {
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

    // Drive dates inside the visible month only
    const drivesByDay = useMemo(() => {
        const map = new Map<number, CalendarDrive[]>();
        const monthStart = startOfMonth(viewMonth).getTime();
        const monthEnd = addMonths(viewMonth, 1).getTime();

        for (const opp of opportunities) {
            if (opp.type !== OpportunityType.WALKIN && !opp.walkInDetails) continue;
            for (const date of getWalkinDates(opp)) {
                const t = date.getTime();
                if (t < monthStart || t >= monthEnd) continue;
                const dayKey = Math.floor(t / 86_400_000);
                const list = map.get(dayKey);
                if (list) list.push({ opp, date });
                else map.set(dayKey, [{ opp, date }]);
            }
        }
        return map;
    }, [opportunities, viewMonth]);

    const todayStart = new Date();
    const todayKey = Math.floor(new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate()).getTime() / 86_400_000);

    const monthLabel = viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const isCurrentMonth = monthLabel === new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const totalDrives = useMemo(() => {
        let count = 0;
        drivesByDay.forEach((v) => (count += v.length));
        return count;
    }, [drivesByDay]);

    const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} variant="panel" className="h-20" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="Calendar unavailable"
                description={error}
                size="md"
                action={<Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Month switcher */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground tracking-tight">{monthLabel}</h2>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {totalDrives} drive{totalDrives === 1 ? '' : 's'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {!isCurrentMonth && (
                        <Button variant="ghost" size="sm" onClick={() => setViewMonth(startOfMonth(new Date()))}>
                            Today
                        </Button>
                    )}
                    <button
                        type="button"
                        onClick={() => setViewMonth((m) => addMonths(m, -1))}
                        className="h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors active-press duration-150 ease-out"
                        aria-label="Previous month"
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMonth((m) => addMonths(m, 1))}
                        className="h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors active-press duration-150 ease-out"
                        aria-label="Next month"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7 gap-1.5">
                {cells.map((cell) => {
                    const dayKey = Math.floor(cell.getTime() / 86_400_000);
                    const drives = drivesByDay.get(dayKey) ?? [];
                    const inMonth = cell.getMonth() === viewMonth.getMonth();
                    const isToday = dayKey === todayKey;
                    const isPast = cell.getTime() < todayKey * 86_400_000;

                    return (
                        <div
                            key={cell.toISOString()}
                            className={cn(
                                'min-h-20 rounded-lg border p-1.5 flex flex-col gap-1 transition-colors',
                                inMonth ? 'border-border bg-card' : 'border-border/40 bg-muted/20',
                                isToday && 'ring-2 ring-primary/40 border-primary/40',
                                isPast && inMonth && 'opacity-50'
                            )}
                        >
                            <span className={cn(
                                'text-xs font-semibold',
                                isToday ? 'text-primary' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                            )}>
                                {cell.getDate()}
                            </span>
                            {drives.slice(0, 2).map(({ opp, date }) => {
                                const bucket = bucketForDate(date);
                                return (
                                    <Link
                                        key={`${opp.id}-${date.toISOString()}`}
                                        href={getOpportunityPathFromItem(opp)}
                                        className={cn(
                                            'block rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight truncate hover:opacity-80 transition-opacity',
                                            BUCKET_STYLES[bucket]
                                        )}
                                        title={`${opp.company} — ${opp.normalizedRole || opp.title}`}
                                    >
                                        {opp.company}
                                    </Link>
                                );
                            })}
                            {drives.length > 2 && (
                                <span className="text-xs text-muted-foreground font-medium px-1">
                                    +{drives.length - 2} more
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bucket legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
                {WALKIN_BUCKETS.map((b) => (
                    <span key={b.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn('w-2.5 h-2.5 rounded-full', BUCKET_STYLES[b.key])} />
                        {b.label}
                    </span>
                ))}
            </div>

            {totalDrives === 0 && (
                <EmptyState
                    title={`No walk-in drives in ${monthLabel}`}
                    description="Check another month or browse all drives."
                    size="md"
                    variant="ghost"
                    action={<Button variant="outline" size="sm" asChild><Link href="/jobs/walkins">Browse all drives</Link></Button>}
                />
            )}
        </div>
    );
}
