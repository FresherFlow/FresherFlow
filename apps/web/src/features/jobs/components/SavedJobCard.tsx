'use client';

import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { Bookmark } from 'lucide-react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { getPostedLabel } from '@/features/jobs/components/JobCard/jobCardUtils';
import { APPLY_CARD_CLASS, ApplyActionContent } from '@/features/jobs/components/ApplyAction';
import { getApplyDestination } from '@/features/jobs/utils/atsProvider';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';
import { cn } from '@/ui/cn';

export interface SavedJobCardProps {
    opp: Opportunity;
    isSaved: boolean;
    onToggleSave: () => void;
    /**
     * The company page already names the company in its header, so repeating
     * it on every row is noise. `false` leaves the posted age alone.
     */
    showCompany?: boolean;
    /**
     * Optional box chip for the meta line, in the same treatment `SkillPill`
     * uses on the job detail page. Omitted on the saved page, which renders
     * exactly as it did before this component existed.
     */
    typeLabel?: string;
    /**
     * Overrides the Apply target. The company page resolves the link through
     * `toSafeOutboundUrl` first; the saved page passes nothing and keeps the
     * original `applyLink || companyWebsite` fallback.
     */
    applyHref?: string | null;
    /**
     * Surface overrides for hosts that frame these rows differently. The
     * company page uses it to drop the card edge in dark, where surfaces are
     * separated by lightness rather than borders. Callers that omit it (the
     * saved-jobs page) keep the exact existing treatment.
     */
    className?: string;
}


/**
 * The saved-jobs row, extracted so /companies/{slug} renders the same card
 * instead of a second hand-built copy that drifts. Both surfaces import this,
 * so a change to the row lands on both at once.
 */
export default function SavedJobCard({
    opp,
    isSaved,
    onToggleSave,
    showCompany = true,
    typeLabel,
    applyHref,
    className,
}: SavedJobCardProps) {
    const companyName =
        typeof opp.company === 'string' ? opp.company : (opp.company as { name?: string })?.name || 'Company';
    const jobHref = getOpportunityPathFromItem(opp);
    const resolvedApplyHref =
        applyHref !== undefined
            ? applyHref
            /* Scraped links can carry a `javascript:`/`data:` scheme; the
               fallback goes through the same trust boundary as every other
               outbound link rather than straight into `href`. */
            : toSafeOutboundUrl((opp as { applyLink?: string }).applyLink)
                ?? toSafeOutboundUrl((opp as { companyWebsite?: string }).companyWebsite);
    const locShort = parseOpportunityLocation(opp.locations).shortLabel;
    const age = getPostedLabel(opp) ?? '';
    const metaText = showCompany ? `${companyName}${age ? ` · ${age}` : ''}` : age;
    // Destination wording stays owned by getApplyDestination. The compact card
    // shows no provider mark, so the accessible name is where it lives.
    const applyDestinationLabel = getApplyDestination(
        (opp as { applyLink?: string }).applyLink,
    ).label;

    return (
        /* Stacks below `sm`, single row from `sm` up. As one row it needed
           logo(40) + gaps + remove(32) + Apply(~90) before the title got any
           width, so on a 386px phone the title ran off the card and Apply
           disappeared entirely. The actions move to their own line on mobile,
           indented to sit under the text rather than under the logo. */
        <div className={cn('flex min-w-0 flex-col gap-2.5 rounded-xs border border-border-strong bg-card p-3 transition-colors hover:border-primary/50 sm:flex-row sm:items-start dark:border-transparent', className)}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <CompanyLogo
                    companyName={companyName}
                    companyWebsite={(opp as { companyWebsite?: string }).companyWebsite}
                    companyLogoUrl={(opp as { companyLogoUrl?: string }).companyLogoUrl}
                    className="!h-10 !w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                    {/* Wrap to two lines rather than truncate. "React Native &
                        Flutter Developer Intern" is the entire reason the row
                        exists; an ellipsis hid the role. */}
                    <Link
                        href={jobHref}
                        className="line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:text-primary"
                    >
                        {opp.title}
                    </Link>
                    {/* Age rides with the company, so this line stays one short
                        truncated run. Location moved down to the actions row. */}
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-snug text-muted-foreground">
                        {typeLabel ? (
                            <span className="inline-flex shrink-0 items-center rounded-xs border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground">
                                {typeLabel}
                            </span>
                        ) : null}
                        <span className="min-w-0 truncate">{metaText}</span>
                    </div>
                </div>
            </div>
            {/* Location sits with the actions rather than under the title, so
                the meta line stays company + age. `mr-auto` keeps it left of the
                buttons on mobile; from `sm` the card is a row so the group
                already sits at the end and the auto margin is dropped. */}
            <div className="flex items-center gap-2 sm:self-center">
                <span className="mr-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:mr-0">
                    {locShort && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{locShort}</span>
                        </span>
                    )}
                </span>
                <button
                    type="button"
                    onClick={onToggleSave}
                    aria-label={isSaved ? `Remove ${opp.title} from saved` : `Save ${opp.title}`}
                    title={isSaved ? 'Remove from saved' : 'Save job'}
                    aria-pressed={isSaved}
                    className="flex size-8 shrink-0 items-center justify-center rounded-xs border border-border text-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted ff-press motion-reduce:transform-none"
                >
                    <Bookmark className="size-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
                {resolvedApplyHref ? (
                    <a
                        href={resolvedApplyHref}
                        target="_blank"
                        rel="noreferrer"
                        title={applyDestinationLabel}
                        aria-label={`${applyDestinationLabel}: ${opp.title}`}
                        className={APPLY_CARD_CLASS}
                    >
                        <ApplyActionContent
                            applyLink={(opp as { applyLink?: string }).applyLink}
                            showDestination
                            showArrow
                        />
                    </a>
                ) : null}
            </div>
        </div>
    );
}
