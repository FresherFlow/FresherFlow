'use client';

import { type Opportunity } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import CompanyLogo from '@/ui/CompanyLogo';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { getPostedLabel } from '@/features/opportunities/components/JobCard/jobCardUtils';

interface OpportunityRowProps {
    opp: Opportunity;
    isSaved?: boolean;
    isApplied?: boolean;
    onToggleSave?: () => void;
    isSelected?: boolean;
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
    if (opp.type === 'INTERNSHIP') return 'Internship';
    if (opp.type === 'WALKIN') return 'Walk-in';
    return null;
}

export function OpportunityRow({
    opp,
    isSaved = false,
    isApplied = false,
    onToggleSave,
    isSelected = false,
    onClick,
    onMouseEnter,
    onMouseLeave,
}: OpportunityRowProps) {
    const location = parseOpportunityLocation(opp.locations);
    const posted = getPostedLabel(opp as Opportunity);
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
                'relative z-10 flex items-start gap-3 rounded-xl px-4 py-3.5 cursor-pointer transition-colors duration-200 ease-out',
                isSelected ? 'bg-primary/[0.08]' : 'bg-transparent'
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {isSelected && (
                <span aria-hidden className="absolute left-1.5 top-2 bottom-2 w-0.75 rounded-full bg-primary" />
            )}
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
                <span className="block text-sm font-semibold leading-snug text-foreground line-clamp-2">
                    {opp.title}
                </span>
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
                    {isApplied ? ' · Applied' : ''}
                </span>
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
