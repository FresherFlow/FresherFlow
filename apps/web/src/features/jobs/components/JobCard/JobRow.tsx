'use client';

import type { ReactNode } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { cn } from '@fresherflow/ui/utils/cn';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { ApplyAction } from '@/features/jobs/components/ApplyAction';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { isCampusDriveOpportunity } from '@/features/jobs/domain/driveTimeline';
import { resolveShowApplied } from '@/features/jobs/domain/trackerState';
import { isGovernmentOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import {
    formatPassoutYears,
    getJobTypeLabel,
    getPostedLabel,
    getSalaryLabel,
    isJobExpired,
    resolvePassoutYears,
} from './jobCardUtils';
import { getWorkModeMetaLabel } from './JobCardMetaConfig';

/**
 * One row, two densities.
 *
 * `list` is the scannable desktop list: two lines per job in a column that
 * does not stretch, so the eye runs down title → company → facts without
 * crossing an empty screen.
 *
 * `split` is the detail pane's sidebar: text-base title, company, facts and
 * date on their own lines. It is deliberately bigger — the sidebar exists to
 * help you choose *one* job, and a dense 60px row made 11 of them fit at once,
 * which turned choosing into skimming.
 *
 * Deliberately hook-less: the feed mounts hundreds of these, and a card tree
 * here costs a ResizeObserver, a measurement strip and a saved/tracker
 * subscription per row.
 *
 * The row is also flat — no border, no radius of its own. Its parent owns the
 * box and the hairlines, so the list reads as one connected stack.
 */
export type JobRowLayout = 'list' | 'split';

export interface JobRowProps {
    opp: Opportunity;
    layout?: JobRowLayout;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    /** Keeps the walk-in map's pin highlight in sync with the hovered row. */
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/** A tagged fact: the listing kind, pay, batch. Grey, 24px tall, no border. */
const PILL =
    'inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-md bg-muted px-2 text-xs font-medium text-foreground/80';

function Dot() {
    return (
        <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
            ·
        </span>
    );
}

export function JobRow({
    opp,
    layout = 'list',
    isSaved = false,
    isApplied = false,
    onToggleSave,
    isSelected = false,
    onClick,
    onMouseEnter,
    onMouseLeave,
}: JobRowProps) {
    const list = layout === 'list';
    const isDrive = isCampusDriveOpportunity(opp);
    const isGovernment = isGovernmentOpportunity(opp);
    const isExpired = isJobExpired(opp);
    const typeLabel = getJobTypeLabel(opp, isDrive, isGovernment);
    const posted = getPostedLabel(opp);
    const showApplied = resolveShowApplied(opp, isApplied);

    // `parseOpportunityLocation` reports an empty location list as "Remote".
    // Say nothing rather than claim a work mode the listing never stated.
    const hasStatedLocation = (opp.locations || []).some((entry) => Boolean(entry && entry.trim()));
    const locationLabel = isDrive
        ? 'PAN India'
        : hasStatedLocation
            ? parseOpportunityLocation(opp.locations).shortLabel
            : '';
    const workMode = getWorkModeMetaLabel((opp.workMode as string) || null);
    const title = opp.title?.trim() || opp.company?.trim() || 'Untitled listing';
    const company = opp.company?.trim() || '';

    // Two kinds of fact, kept apart the way the strongest job boards do it:
    // prose facts sit dot-separated on the meta line (place · mode · date),
    // and the tagged facts (kind of listing, pay, batch) are grey pills after
    // it. Mixing pills into a dotted line is what made this row read as noise.
    const textFacts: ReactNode[] = [];
    if (locationLabel) {
        textFacts.push(
            <span key="location" className="inline-flex min-w-0 items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate" title={locationLabel}>
                    {locationLabel}
                </span>
            </span>,
        );
    }
    if (workMode) {
        textFacts.push(
            <span key="mode" className="whitespace-nowrap">
                {workMode}
            </span>,
        );
    }
    if (posted) {
        textFacts.push(
            <span key="posted" className="whitespace-nowrap tabular-nums">
                {posted}
            </span>,
        );
    }

    // Pay used to live in a right-hand rail, which forced that rail — and then
    // the Apply button — to a guessed fixed width. As a pill it costs nothing.
    const salaryLabel = getSalaryLabel(opp, isGovernment, isDrive);
    const batchLabel = list ? formatPassoutYears(resolvePassoutYears(opp)) : null;
    const pills: ReactNode[] = [
        <span key="type" className={PILL}>
            {typeLabel}
        </span>,
    ];
    if (salaryLabel) {
        pills.push(
            <span key="salary" className={PILL}>
                {salaryLabel}
            </span>,
        );
    }
    if (batchLabel) {
        pills.push(
            <span key="batch" className={PILL}>
                Batch {batchLabel}
            </span>,
        );
    }

    const factsRow = (
        <span
            className={cn(
                'mt-1.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-muted-foreground',
                list ? 'text-meta' : 'text-sm',
            )}
        >
            <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
                {textFacts.map((fact, index) => (
                    <span key={index} className="inline-flex min-w-0 items-center gap-1.5">
                        {index > 0 && <Dot />}
                        {fact}
                    </span>
                ))}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">{pills}</span>
        </span>
    );

    return (
        <div
            data-selected={isSelected ? 'true' : undefined}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
                'group relative flex w-full gap-3 pl-4 pr-3 text-left transition-colors duration-150 ease-out',
                'cursor-pointer',
                // A fixed height so the two actions can hold the row's top and
                // bottom corners; without it "top" and "bottom" would move per
                // row as content wrapped. Content is top-aligned in the space
                // the actions leave.
                list ? 'h-28 items-start py-3' : 'items-start py-4',
                isSelected
                    ? 'bg-muted'
                    : '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40',
                isExpired && 'opacity-60',
            )}
        >
            {/* Selection is a rule, not a grey blob: the row keeps the list's
                geometry and the accent marks which one is open. */}
            {isSelected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />}

            <CompanyLogo
                companyName={opp.company}
                companyWebsite={opp.companyWebsite}
                companyLogoUrl={opp.companyLogoUrl}
                applyLink={opp.applyLink}
                isGovernment={isGovernment}
                className={cn('rounded-md !w-10 !h-10', list && 'mt-0.5')}
            />

            <button
                type="button"
                onClick={(e) => {
                    // One surface, one handler: call directly, block the bubble
                    // so the row handler doesn't fire twice (double history entry).
                    e.stopPropagation();
                    onClick?.(e);
                }}
                aria-current={isSelected ? 'true' : undefined}
                className="min-w-0 flex-1 cursor-pointer rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span
                        className={cn(
                            'truncate font-semibold text-foreground transition-colors duration-150 ease-out group-hover:text-primary',
                            list ? 'text-base' : 'text-base leading-snug',
                        )}
                        title={title}
                    >
                        {title}
                    </span>
                    {showApplied && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-success/20 bg-success/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-success">
                            <CheckIcon className="h-3 w-3" aria-hidden="true" />
                            Applied
                        </span>
                    )}
                </span>

                {company && (
                    <span
                        className={cn(
                            'block truncate text-muted-foreground',
                            list ? 'mt-0.5 text-sm' : 'mt-1 text-sm',
                        )}
                        title={company}
                        dir="auto"
                    >
                        {company}
                    </span>
                )}                {factsRow}
                {!list && posted && (
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                        Posted {posted}
                    </span>
                )}
            </button>

            {/* Save holds the row's top-right corner, Apply its bottom-right —
                the two actions use the row's height instead of sitting in a
                line beside each other. */}
            <div
                className={cn(
                    'flex shrink-0',
                    list ? 'h-full flex-col items-end justify-between' : 'items-center gap-2',
                )}
            >
                {/* Apply, then Save at the far right of the row — the primary
                    action sits last before the edge, the small icon control
                    ends it. */}
                {/* Every row names where Apply goes — "Apply on Greenhouse",
                    "Apply on Lever", "Apply on company website". A button that
                    says only "Apply" next to one that names its ATS was the
                    inconsistency: the reader cannot tell whether the two mean
                    different things. */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.();
                    }}
                    aria-label={isSaved ? 'Unsave opportunity' : 'Save opportunity'}
                    aria-pressed={isSaved}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {isSaved ? (
                        <BookmarkSolidIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                        <BookmarkIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                </button>
                {list && (
                    <ApplyAction
                        size="row"
                        applyLink={opp.applyLink}
                        isGovernment={isGovernment}
                        showDestination
                        stopPropagation
                    />
                )}
            </div>

        </div>
    );
}
