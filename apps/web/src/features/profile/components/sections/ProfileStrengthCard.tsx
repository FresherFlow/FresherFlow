'use client';

import { useState } from 'react';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { countChecklist, type ProfileChecklistItem } from '@/features/profile/profileChecklist';
import type { ProfileSectionId } from '@/features/profile/profileSections';

/**
 * Completion, read from the one checklist in profileChecklist.ts.
 *
 * This card used to be two things at once: a score, and a nine-row list of
 * everything you had not done yet — the loudest element on the page, and the
 * least useful, because a badge-new profile saw nine identical instructions.
 * Now it leads with the score and the single next thing worth doing; the rest
 * is one click away.
 *
 * SINGLE-COMPLETION-STORY NOTE: this card is deliberately a *checklist count*
 * (done/total from profileChecklist.ts), never a %. The % bars — onboarding
 * (app/(auth)/onboarding/page.tsx reads profile.completionPercentage) and the
 * dashboard header — both show the weighted completionPercentage, i.e.
 * calculateProfileCompletion (packages/utils/src/profile/completion.ts).
 * Keeping this card in x/y form is what ends the two-% confusion; do not
 * reintroduce a % here and do not redesign the scoring.
 */
export function ProfileStrengthCard({
    checklist,
    onNavigateSection,
    compact = false,
    className,
}: {
    checklist: ProfileChecklistItem[];
    onNavigateSection?: (sectionId: ProfileSectionId) => void;
    /** One row: score, bar, and the next step. Used under the content on phones. */
    compact?: boolean;
    className?: string;
}) {
    const [showAll, setShowAll] = useState(false);

    const { done, total } = countChecklist(checklist);
    const score = total > 0 ? Math.round((done / total) * 100) : 0;
    const open = checklist.filter((item) => !item.done);
    const [next, ...rest] = open;

    if (compact) {
        return (
            <section className={cn('rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm', className)}>
                <div className="flex items-center gap-3">
                    <span className="shrink-0 text-xs font-medium text-foreground">Profile checklist</span>
                    <div
                        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Profile checklist progress"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${score}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                        {done}/{total}
                    </span>
                </div>

                {next ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-xs text-muted-foreground">
                            {done} of {total} done
                        </p>
                        <Button variant="outline" size="sm" onClick={() => onNavigateSection?.(next.section)}>
                            {next.shortLabel ?? next.label}
                        </Button>
                    </div>
                ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
                        <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Everything is filled in
                    </p>
                )}
            </section>
        );
    }

    return (
        <section className={cn('rounded-2xl border border-border/70 bg-card p-4 shadow-sm', className)}>
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Profile checklist</h2>
                <span className="text-sm font-semibold tabular-nums text-primary">
                    {done}/{total}
                </span>
            </div>

            <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile checklist progress"
            >
                <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${score}%` }}
                />
            </div>

            {open.length === 0 ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Everything is filled in
                </p>
            ) : (
                <>
                    {next && (
                        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                            <p className="text-xs text-muted-foreground">{done} of {total} done · next up</p>
                            <button
                                type="button"
                                onClick={() => onNavigateSection?.(next.section)}
                                className="w-full rounded-lg bg-primary px-3 py-2 text-left text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                {next.shortLabel ?? next.label}
                            </button>
                        </div>
                    )}

                    {rest.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowAll((value) => !value)}
                                aria-expanded={showAll}
                                className="mt-2 flex w-full items-center gap-1 rounded-lg px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <ChevronDown
                                    className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')}
                                    aria-hidden="true"
                                />
                                {showAll ? 'Hide' : `${rest.length} more`}
                            </button>

                            {showAll && (
                                <ul className="mt-1 space-y-0.5">
                                    {rest.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => onNavigateSection?.(item.section)}
                                                className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                {item.shortLabel ?? item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </>
            )}
        </section>
    );
}
