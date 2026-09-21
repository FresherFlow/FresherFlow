'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContributeSheet, type ContributeType } from './ContributeSheet';
import { ContributionHistory } from './ContributionHistory';
import { Button } from '@/ui/Button';

const CARDS: Array<{
    type: ContributeType;
    label: string;
    description: string;
    hint: string;
}> = [
    {
        type: 'JOB',
        label: 'Share a job or internship',
        description: 'Paste the official link. We keep the source and who shared it.',
        hint: 'Reviewed before it goes live',
    },
    {
        type: 'WALKIN',
        label: 'Share a walk-in drive',
        description: 'Direct hiring drive with a date and venue.',
        hint: 'Date and venue required',
    },
    {
        type: 'INTERVIEW_EXPERIENCE',
        label: 'Share an interview experience',
        description: 'Rounds, questions, and the result — help your batch prepare.',
        hint: 'Attached to a job listing',
    },
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

    const openSheet = useCallback((type: ContributeType) => {
        setSheetType(type);
        setSheetOpen(true);
    }, []);

    // Deep link: /contribute?type=JOB opens the sheet preselected, without the
    // page navigating anywhere. The resubmit link from history lands here too.
    useEffect(() => {
        const type = typeFromParam(searchParams.get('type'));
        if (type) {
            openSheet(type);
        }
    }, [searchParams, openSheet]);

    return (
        <div className="space-y-10">
            <section className="space-y-4" aria-label="Choose what to contribute">
                <div className="grid gap-4 sm:grid-cols-3">
                    {CARDS.map((card) => (
                        <button
                            key={card.type}
                            type="button"
                            onClick={() => openSheet(card.type)}
                            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-all duration-150 ease-out hover:border-primary/40 active-press-soft motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <p className="text-base font-bold text-foreground">{card.label}</p>
                            <p className="text-sm text-muted-foreground">{card.description}</p>
                            <span className="mt-auto pt-2 text-xs font-semibold uppercase tracking-widest text-primary">
                                {card.hint}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-4" aria-label="Your contributions">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Your contributions</h2>
                    <Button variant="outline" size="sm" onClick={() => openSheet('JOB')}>
                        Share something
                    </Button>
                </div>
                <ContributionHistory onContribute={() => openSheet('JOB')} refreshKey={refreshKey} />
            </section>

            <ContributeSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                initialType={sheetType}
                onSubmitted={() => setRefreshKey((k) => k + 1)}
            />
        </div>
        );
}
