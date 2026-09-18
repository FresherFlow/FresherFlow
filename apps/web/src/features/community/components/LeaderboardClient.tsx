'use client';

import { useEffect, useState } from 'react';
import { contributorsApi } from '@fresherflow/api-client';
import type { LeaderboardEntry } from '@fresherflow/api-client';
import { cn } from '@repo/ui/utils/cn';

const MEDAL_COLORS = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-muted-foreground">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="ff-min-w-2ch text-right font-semibold tabular-nums text-foreground">{value}</span>
        </div>
    );
}

export function LeaderboardClient() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        contributorsApi
            .leaderboard(20)
            .then((res) => setEntries(res.leaderboard))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const maxSubs = Math.max(...entries.map((e) => e.stats.submissions), 1);
    const maxComments = Math.max(...entries.map((e) => e.stats.comments), 1);
    const maxSignals = Math.max(...entries.map((e) => e.stats.signals), 1);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                Could not load the leaderboard.{' '}
                <button type="button" onClick={() => window.location.reload()} className="font-semibold text-primary hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No contributors yet. Be the first to submit a job or leave a helpful comment!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {entries.map((entry, idx) => (
                <div
                    key={entry.id}
                    className={cn(
                        'rounded-2xl border bg-card p-5 space-y-3 transition-colors hover:bg-card/80',
                        idx === 0 ? 'border-warning/30 bg-warning/[0.03]' : 'border-border'
                    )}
                >
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/40 text-sm font-bold text-foreground">
                            {idx < 3 ? (
                                <span className={cn('text-base', MEDAL_COLORS[idx])}>#{idx + 1}</span>
                            ) : (
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                            )}
                        </div>

                        {/* Avatar + name */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/u/${entry.username || entry.id}`}
                                    className="font-semibold text-foreground hover:underline truncate"
                                >
                                    {entry.fullName || entry.username || 'Anonymous'}
                                </a>
                                {entry.username && (
                                    <span className="text-xs text-muted-foreground truncate">
                                        @{entry.username}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                                    entry.trustLevel === 'CONTRIBUTOR' ? 'bg-primary/10 text-primary' :
                                    entry.trustLevel === 'MODERATOR' ? 'bg-warning/10 text-warning' :
                                    'bg-muted/40 text-muted-foreground'
                                )}>
                                    {entry.trustLevel}
                                </span>
                            </div>
                        </div>

                        {/* Score badge */}
                        <div className="shrink-0 text-right">
                            <div className="text-lg font-bold tabular-nums text-foreground">{entry.stats.score}</div>
                            <div className="text-xs text-muted-foreground">score</div>
                        </div>
                    </div>

                    {/* Stats bars */}
                    <div className="space-y-1.5 pl-12">
                        <StatBar label="Jobs" value={entry.stats.submissions} max={maxSubs} />
                        <StatBar label="Comments" value={entry.stats.comments} max={maxComments} />
                        <StatBar label="Signals" value={entry.stats.signals} max={maxSignals} />
                    </div>
                </div>
            ))}

            {/* Score explanation */}
            <div className="rounded-xl bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">How scoring works</p>
                <p>Jobs submitted × 3 + Comments × 2 + Signals × 1 = Total score</p>
            </div>
        </div>
    );
}
