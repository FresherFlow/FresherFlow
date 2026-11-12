'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { JobCardResponsive } from '@/features/jobs/components/JobCard';
import type { Opportunity } from '@fresherflow/types';
import { DEMO_JOBS, WORST_JOBS } from './fixtures';

/**
 * Dev-only harness for the `break-ui` skill: renders the real job card against
 * a plausible worst-case dataset, behind a Demo / Worst case switch.
 *
 * The switch swaps the fixture only — the card component is untouched, so a
 * break here is a break in the card, not in the harness.
 */

const STATES = [
    { key: 'demo', label: 'Demo data' },
    { key: 'worst', label: 'Worst case' },
    { key: 'empty', label: 'Empty' },
    { key: 'one', label: 'One' },
    { key: 'many', label: '1,000 rows' },
] as const;

type StateKey = (typeof STATES)[number]['key'];

/** The list is infinite-scroll, so the upper bound is what one screen can reach. */
const MANY_COUNT = 1000;

function jobsFor(state: StateKey): Opportunity[] {
    switch (state) {
        case 'worst':
            return WORST_JOBS;
        case 'empty':
            return [];
        case 'one':
            return DEMO_JOBS.slice(0, 1);
        case 'many':
            return Array.from({ length: MANY_COUNT }, (_, index) => {
                const source = DEMO_JOBS[index % DEMO_JOBS.length];
                return { ...source, id: `many-${index}`, slug: `many-${index}` };
            });
        case 'demo':
        default:
            return DEMO_JOBS;
    }
}

export default function BreakUiClient() {
    const router = useRouter();
    const params = useSearchParams();
    const requested = params.get('data');
    const state: StateKey = STATES.some((entry) => entry.key === requested)
        ? (requested as StateKey)
        : 'demo';

    const select = useCallback(
        (next: StateKey) => {
            router.replace(`/break-ui/job-card?data=${next}`, { scroll: false });
        },
        [router]
    );

    const jobs = jobsFor(state);

    return (
        <div className="min-h-dvh bg-background pb-24">
            <header className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    break-ui · job card
                </p>
                <h1 className="mt-1 text-sm text-foreground">
                    {state === 'worst'
                        ? `${jobs.length} worst-case listings`
                        : state === 'empty'
                          ? '0 listings — list-level empty state lives in the feed'
                          : `${jobs.length} listing${jobs.length === 1 ? '' : 's'}`}
                </h1>
            </header>

            <main className="mx-auto w-full max-w-[720px] px-3 py-4">
                {state === 'empty' ? (
                    <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                        The card renders nothing for an empty list; the feed owns the empty state.
                        Nothing to break here.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {jobs.map((job) => (
                            <JobCardResponsive
                                key={job.id}
                                job={job}
                                jobId={job.id}
                                isApplied={state === 'worst' && job.id === 'worst-long-title'}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Harness chrome: deliberately plain, fixed out of the card's way. */}
            <div
                className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-neutral-300 bg-neutral-100 p-1 shadow-lg"
                role="group"
                aria-label="Dataset"
            >
                <div className="flex items-center gap-1">
                    {STATES.map((entry) => (
                        <button
                            key={entry.key}
                            type="button"
                            onClick={() => select(entry.key)}
                            aria-pressed={state === entry.key}
                            className={
                                state === entry.key
                                    ? 'rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm'
                                    : 'rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900'
                            }
                            style={{ fontFamily: 'system-ui, sans-serif' }}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
