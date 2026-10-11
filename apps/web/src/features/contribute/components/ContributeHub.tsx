'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContributeSheet, type ContributeType } from './ContributeSheet';
import { ContributionHistory, type ContributionStats } from './ContributionHistory';
import { Button } from '@/ui/Button';

// One card per submit flow `ContributeSheet` actually implements. Community
// posts and resource shares are read-only here today — `ContributionHistory`
// lists them once they exist, but the sheet has no form or submit path for
// them, so offering a card would open a sheet that cannot do anything.
const CARDS: Array<{
    type: ContributeType;
    title: string;
    detail: string;
    action: string;
}> = [
    {
        type: 'JOB',
        title: 'Job or internship',
        detail: 'Official hiring link',
        action: 'Share',
    },
    {
        type: 'WALKIN',
        title: 'Walk-in drive',
        detail: 'Date, time and venue',
        action: 'Share',
    },
    {
        type: 'INTERVIEW_EXPERIENCE',
        title: 'Interview experience',
        detail: 'Rounds and questions',
        action: 'Share',
    },
];

const STATS: Array<{ key: keyof ContributionStats; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'live', label: 'Live' },
    { key: 'needsAttention', label: 'Needs attention' },
];

function typeFromParam(value: string | null): ContributeType | null {
    switch (value) {
        case 'JOB':
        case 'WALKIN':
            return value;
        case 'IEX':
        case 'INTERVIEW_EXPERIENCE':
            return 'INTERVIEW_EXPERIENCE';
        default:
            return null;
    }
}

export function ContributeHub() {
    const searchParams = useSearchParams();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetType, setSheetType] = useState<ContributeType | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    // Optimistic composer entry: set on submit alongside `refreshKey` so the
    // history shows a Pending card while the refetch lands. The sheet's
    // `onSubmitted` carries no title, so this is a generic label derived from
    // the opened type — never a fabricated job title. Cleared on the next
    // history load via `handleStatsChange` (and dropped in-history when `rows`
    // refreshes, so a fast refetch never duplicates).
    const [justSubmitted, setJustSubmitted] = useState<{ title: string; kind: string } | null>(null);
    // Summary counts come from the history's loaded rows via `onStatsChange`
    // — never hardcoded. Null until the first callback fires (signed out or
    // still loading), rendered as "—" placeholders.
    const [stats, setStats] = useState<ContributionStats | null>(null);

    const openSheet = useCallback((type: ContributeType) => {
        setSheetType(type);
        setSheetOpen(true);
    }, []);

    // Deep link: /contribute?type=JOB opens the sheet preselected, without the
    // page navigating anywhere. The resubmit link from history lands here too
    // (/contribute?type=JOB&source=<url>); `source` is preserved below and
    // passed through as the sheet's prefill.
    useEffect(() => {
        const type = typeFromParam(searchParams.get('type'));
        if (type) {
            openSheet(type);
        }
    }, [searchParams, openSheet]);

    // Guarded so a repeated identical callback never re-renders the hub.
    // Also clears the optimistic entry: stats arrive only after `rows`
    // refreshes, which is exactly when the real row (or its absence) is known.
    const handleStatsChange = useCallback((next: ContributionStats) => {
        setStats((prev) =>
            prev !== null &&
            prev.pending === next.pending &&
            prev.live === next.live &&
            prev.needsAttention === next.needsAttention
                ? prev
                : next,
        );
        setJustSubmitted(null);
    }, []);

    const handleSubmitted = useCallback(() => {
        setRefreshKey((k) => k + 1);
        setJustSubmitted({
            title: 'Your recent submission',
            kind: sheetType === 'INTERVIEW_EXPERIENCE' ? 'Interview' : 'Job',
        });
    }, [sheetType]);

    const prefillSourceUrl = searchParams.get('source');

    return (
        <div className="space-y-8">
            <section className="space-y-3" aria-label="Choose what to contribute">
                <p className="text-sm text-muted-foreground">Choose a contribution type to get started.</p>
                <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                    {CARDS.map((card) => (
                        <button
                            key={card.type}
                            type="button"
                            onClick={() => openSheet(card.type)}
                            className="group flex min-h-11 flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/40"
                        >
                            <span className="text-base font-semibold text-foreground">{card.title}</span>
                            <span className="text-meta text-muted-foreground">{card.detail}</span>
                            <span className="mt-auto pt-2 text-xs font-semibold uppercase tracking-widest text-primary">
                                {card.action}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-4" aria-label="Your contributions">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-foreground">Your contributions</h2>
                    <Button variant="outline" size="sm" onClick={() => openSheet('JOB')}>
                        Share something
                    </Button>
                </div>
                <dl className="grid grid-cols-3 gap-3" aria-live="polite" aria-label="Contribution status summary">
                    {STATS.map((stat) => (
                        <div
                            key={stat.key}
                            className="rounded-2xl border border-border bg-card px-3 py-2.5 text-center sm:px-4 sm:py-3"
                        >
                            <dt className="text-xs font-medium text-muted-foreground sm:text-meta">{stat.label}</dt>
                            <dd className="text-lg font-bold text-foreground sm:text-xl">
                                {stats === null ? '—' : stats[stat.key]}
                            </dd>
                        </div>
                    ))}
                </dl>
                <ContributionHistory
                    onContribute={() => openSheet('JOB')}
                    refreshKey={refreshKey}
                    onStatsChange={handleStatsChange}
                    justSubmitted={justSubmitted}
                />
            </section>

            <ContributeSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                initialType={sheetType}
                prefillSourceUrl={prefillSourceUrl}
                onSubmitted={handleSubmitted}
            />
        </div>
    );
}
