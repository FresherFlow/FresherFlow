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
    /** Rendered inside the row, above the title. Keeps the match badge attached to its job. */
    matchBadge?: ReactNode;
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
    matchBadge,
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
        <span className="mt-1.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
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
                'group relative flex w-full gap-4 px-4 py-4 text-left transition-colors duration-150 ease-out cursor-pointer',
                // Content and actions share one horizontal band. The old fixed
                // 112px row pinned Save top-right and Apply bottom-right, which
                // left a dead gap between them and pushed the primary action
                // away from the job it belongs to.
                list ? 'items-center' : 'items-start',
                isSelected
                    ? 'bg-muted'
                    : '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40',
                isExpired && 'opacity-60',
            )}
        >
            {isSelected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />}

            <CompanyLogo
                companyName={opp.company}
                companyWebsite={opp.companyWebsite}
                companyLogoUrl={opp.companyLogoUrl}
                applyLink={opp.applyLink}
                isGovernment={isGovernment}
                className="!h-10 !w-10 shrink-0 rounded-md"
            />

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e);
                }}
                aria-current={isSelected ? 'true' : undefined}
                className="min-w-0 flex-1 cursor-pointer rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                {matchBadge && <span className="mb-1.5 flex items-center gap-2">{matchBadge}</span>}
                <span className="flex min-w-0 items-center gap-2">
                    <span
                        className="truncate text-sm font-semibold text-foreground transition-colors duration-150 ease-out group-hover:text-primary"
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
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={company} dir="auto">
                        {company}
                    </span>
                )}
                {factsRow}
                {!list && posted && (
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                        Posted {posted}
                    </span>
                )}
            </button>

            {/* Both actions sit together at the edge, vertically aligned with
                the job. Every Apply label names its destination. */}
            <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.();
                    }}
                    aria-label={isSaved ? 'Unsave opportunity' : 'Save opportunity'}
                    aria-pressed={isSaved}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {isSaved ? (
                        <BookmarkSolidIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                        <BookmarkIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                </button>
                {list && (
                    <ApplyAction
                        size="card"
                        applyLink={opp.applyLink}
                        isGovernment={isGovernment}
                        showDestination
                        stopPropagation
                        className="[@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 focus-within:opacity-100"
                    />
                )}
            </div>
        </div>
    );
}
