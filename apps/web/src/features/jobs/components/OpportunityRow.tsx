'use client';

import { type Opportunity } from '@fresherflow/types';
import { cn } from '@fresherflow/ui/utils/cn';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { getPostedLabel } from '@/features/jobs/components/JobCard/jobCardUtils';
import { isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { resolveShowApplied } from '@/features/jobs/domain/trackerState';

interface OpportunityRowProps {
    opp: Opportunity;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isSelected?: boolean;
    /**
     * `stacked` is the split pane's narrow column: four short lines that
     * survive ~360px. `wide` is the full-width List view, where the same four
     * lines read as a phone card stranded in a desktop column (DESIGN_SYSTEM
     * §6: wide row on desktop). One row, two densities — not two components.
     */
    layout?: 'stacked' | 'wide';
    onClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function getModeLabel(opp: Opportunity): string | null {
    const raw = String((opp as unknown as Record<string, unknown>).workMode || '').toLowerCase();
    if (raw === 'remote') return 'Remote';
    if (raw === 'hybrid') return 'Hybrid';
    if (raw === 'on_site' || raw === 'onsite' || raw === 'in person' || raw === 'in_person') return 'On-site';
    const locs = (opp.locations || []).join(' ').toLowerCase();
    if (locs.includes('remote') || locs.includes('wfh') || locs.includes('work from home')) return 'Remote';
    if (locs.includes('hybrid')) return 'Hybrid';
    return null;
}

function getTypePrefix(opp: Opportunity): string | null {
    if (isInternshipOpportunity(opp)) return 'Internship';
    if (isWalkinOpportunity(opp)) return 'Walk-in';
    return null;
}

export function OpportunityRow({
    opp,
    isSaved = false,
    isApplied = false,
    onToggleSave,
    isSelected = false,
    layout = 'stacked',
    onClick,
    onMouseEnter,
    onMouseLeave,
}: OpportunityRowProps) {
    const wide = layout === 'wide';
    const location = parseOpportunityLocation(opp.locations);
    const posted = getPostedLabel(opp as Opportunity);
    // Reading the payload's actions needs no hook, so the row stays hook-less
    // (see `CategoryPageView`). Without this, an APPLIED action was invisible in
    // the split sidebar even though the list card above it showed Applied.
    const showApplied = resolveShowApplied(opp, isApplied);
    const mode = getModeLabel(opp);
    const typePrefix = getTypePrefix(opp);
    const meta = [typePrefix, location.shortLabel !== 'Remote' ? location.shortLabel : null, mode]
        .filter(Boolean)
        .join(' · ');
    const isGovernment = Boolean(opp.governmentJobDetails);

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative z-10 flex gap-3 rounded-xl px-4 cursor-pointer transition-colors duration-200 ease-out',
                wide ? 'items-center py-3' : 'items-start py-3.5',
                isSelected ? 'bg-chip-active text-chip-active-text' : 'bg-transparent'
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <CompanyLogo
                companyName={opp.company}
                companyWebsite={opp.companyWebsite}
                companyLogoUrl={opp.companyLogoUrl}
                applyLink={opp.applyLink}
                isGovernment={isGovernment}
                className="w-10 h-10 object-contain shrink-0"
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
                className="min-w-0 flex-1 cursor-pointer text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <span
                    className={cn(
                        'font-semibold text-foreground',
                        wide
                            ? 'block truncate text-sm leading-snug'
                            : 'block text-sm leading-snug line-clamp-2'
                    )}
                >
                    {opp.title}
                </span>
                {wide ? (
                    <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                        {[opp.company, meta, posted, showApplied ? 'Applied' : null]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                ) : (
                    <>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                            {opp.company}
                        </span>
                        {meta && (
                            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                                {meta}
                            </span>
                        )}
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                            {posted}
                            {showApplied ? ' · Applied' : ''}
                        </span>
                    </>
                )}
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave?.();
                }}
                aria-label={isSaved ? 'Unsave opportunity' : 'Save opportunity'}
                aria-pressed={isSaved}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {isSaved ? (
                    <BookmarkSolidIcon className="h-5 w-5 text-primary" />
                ) : (
                    <BookmarkIcon className="h-5 w-5" />
                )}
            </button>
        </div>
    );
}
