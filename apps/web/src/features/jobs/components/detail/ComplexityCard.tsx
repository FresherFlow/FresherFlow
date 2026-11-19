'use client';

import { useState } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { ClipboardDocumentListIcon, CodeBracketIcon, ClockIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

type ComplexityCardProps = {
    applicationDetails: NonNullable<Opportunity['applicationDetails']>;
};

export function ComplexityCard({ applicationDetails }: ComplexityCardProps) {
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const { method, platform, estimatedMinutes, requiredItems } = applicationDetails;

    if (method !== 'FORM' && method !== 'ASSESSMENT') {
        return null;
    }

    const toggleItem = (idx: number) => {
        setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };

    const isAssessment = method === 'ASSESSMENT';

    return (
        <div className="rounded-xl border border-border bg-card p-5 dark:border-transparent md:p-6">
            <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">
                    {isAssessment ? 'Online assessment' : 'Form application'}
                </h3>
            </div>

            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {isAssessment
                    ? 'This opportunity includes a timed test, coding assessment, or exam.'
                    : 'This opportunity requires filling out an external portal or form.'}
            </p>

            {(platform || estimatedMinutes) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted-foreground">
                    {platform && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                            <ComputerDesktopIcon className="size-3.5 shrink-0" aria-hidden="true" />
                            Platform: <span className="truncate font-semibold text-foreground">{platform}</span>
                        </span>
                    )}
                    {estimatedMinutes && (
                        <span className="inline-flex items-center gap-1.5">
                            <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
                            About {estimatedMinutes} mins
                        </span>
                    )}
                </div>
            )}

            {requiredItems && requiredItems.length > 0 && (
                <section className="mt-4 border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground">
                        {isAssessment ? 'What to expect' : 'Prepare before applying'}
                    </h4>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {requiredItems.map((item, idx) => {
                            const isChecked = Boolean(checkedItems[idx]);
                            return (
                                <li key={idx}>
                                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md bg-surface-sunken px-2.5 py-2 text-xs font-medium text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleItem(idx)}
                                            className="size-3.5 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                        <span className={isChecked ? 'text-muted-foreground line-through' : ''}>
                                            {item}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
