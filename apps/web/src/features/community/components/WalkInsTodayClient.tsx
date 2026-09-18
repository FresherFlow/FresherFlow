'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { WalkInTodayItem, WalkInsTodayResult } from '@fresherflow/api-client';
import { cn } from '@repo/ui/utils/cn';

const CITIES = ['Hyderabad', 'Bangalore', 'Chennai', 'Pune', 'Noida', 'Gurugram', 'Kolkata', 'Mumbai'] as const;
const BATCHES = [2025, 2026, 2027] as const;

function formatDriveDate(dates: string[], dateRange: string | null | undefined): string {
    if (dateRange) return dateRange;
    if (dates.length === 0) return 'Ongoing';
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const sameDay = first.toDateString() === last.toDateString();
    const fmt = (d: Date) =>
        d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return sameDay ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

function DriveCard({ item, bucket }: { item: WalkInTodayItem; bucket: 'today' | 'tomorrow' | 'upcoming' | 'undated' }) {
    const w = item.walkIn;
    const isToday = bucket === 'today';

    return (
        <article
            className={cn(
                'rounded-2xl border bg-card p-4 space-y-2.5',
                isToday ? 'border-primary/40 shadow-sm' : 'border-border'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.company}</p>
                </div>
                {isToday && (
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Today
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {w?.city && <span>{w.city}</span>}
                <span>{formatDriveDate(w?.dates ?? [], w?.dateRange)}</span>
                {w?.timeRange && <span>{w.timeRange}</span>}
                {item.salaryRange && <span className="font-semibold text-foreground">{item.salaryRange}</span>}
            </div>

            {w?.clusterName && (
                <p className="truncate text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{w.clusterName}</span>
                    {w.venueAddress ? ` · ${w.venueAddress}` : ''}
                </p>
            )}

            {item.allowedPassoutYears.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {item.allowedPassoutYears.slice(0, 4).map((y) => (
                        <span key={y} className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {y} batch
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                {item.applyLink && (
                    <a
                        href={item.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Apply
                    </a>
                )}
                <Link
                    href={`/jobs/${item.slug}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                    Details
                </Link>
            </div>
        </article>
    );
}

function BucketSection({
    title,
    subtitle,
    items,
    bucket,
}: {
    title: string;
    subtitle: string;
    items: WalkInTodayItem[];
    bucket: 'today' | 'tomorrow' | 'upcoming' | 'undated';
}) {
    if (items.length === 0) return null;
    return (
        <section className="space-y-3">
            <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? 'drive' : 'drives'} · {subtitle}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((item) => (
                    <DriveCard key={item.id} item={item} bucket={bucket} />
                ))}
            </div>
        </section>
    );
}

export function WalkInsTodayClient() {
    const [data, setData] = useState<WalkInsTodayResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [city, setCity] = useState<string>('');
    const [batch, setBatch] = useState<string>('');

    const load = useCallback(() => {
        setLoading(true);
        setError(false);
        fresherNeedsApi
            .listWalkInsToday({
                city: city || undefined,
                batch: batch ? parseInt(batch, 10) : undefined,
                limit: 150,
            })
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [city, batch]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setCity('')}
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                            city === ''
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        All cities
                    </button>
                    {CITIES.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCity(c === city ? '' : c)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                city === c
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                            )}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Batch:</span>
                    <button
                        type="button"
                        onClick={() => setBatch('')}
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                            batch === ''
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        Any
                    </button>
                    {BATCHES.map((b) => (
                        <button
                            key={b}
                            type="button"
                            onClick={() => setBatch(String(b) === batch ? '' : String(b))}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                batch === String(b)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                            )}
                        >
                            {b}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/40" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    Could not load today&apos;s walk-ins.{' '}
                    <button type="button" onClick={load} className="font-semibold text-primary hover:underline">
                        Retry
                    </button>
                </div>
            ) : data && data.total === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    No walk-in drives match your filters right now. Check back tomorrow morning — new drives are posted daily.
                </div>
            ) : data ? (
                <>
                    <BucketSection title="Happening today" subtitle="carry your documents" items={data.today} bucket="today" />
                    <BucketSection title="Tomorrow" subtitle="plan ahead" items={data.tomorrow} bucket="tomorrow" />
                    <BucketSection title="Later this cycle" subtitle="upcoming dates" items={data.upcoming} bucket="upcoming" />
                    <BucketSection title="Ongoing / dates not listed" subtitle="verify before travelling" items={data.undated} bucket="undated" />
                </>
            ) : null}

            {data && data.total > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                    Dates can change. Always verify venue details on the drive page before travelling.
                </p>
            )}
        </div>
    );
}
