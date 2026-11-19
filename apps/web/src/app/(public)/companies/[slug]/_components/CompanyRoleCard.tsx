import type { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';

type Props = {
    opp: Opportunity;
    /** Sanitised outbound apply URL supplied by the page; job page is the fallback. */
    applyHref?: string | null;
};

/** Quiet separator between prose facts, matching the detail page's card. */
function Dot() {
    return <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">·</span>;
}

/**
 * The company page's role row: the same card as the detail page's Related
 * opportunities. Navigation is an explicit "View details" action, so clicking
 * the row never has to guess between opening the job and applying.
 */
export default function CompanyRoleCard({ opp, applyHref }: Props) {
    const jobPath = getOpportunityPathFromItem(opp);
    const safeApplyHref = toSafeOutboundUrl(applyHref);
    const actionHref = safeApplyHref || jobPath;

    const location = parseOpportunityLocation(opp.locations).shortLabel;
    const isGovernment = opp.sector === 'GOVERNMENT';
    const typeLabel = isGovernment
        ? 'Govt'
        : isInternshipOpportunity(opp)
            ? 'Intern'
            : isWalkinOpportunity(opp)
                ? 'Walk-in'
                : 'Job';

    const postedAt = opp.postedAt ? new Date(opp.postedAt) : null;
    const postedLabel =
        postedAt && !Number.isNaN(postedAt.getTime())
            ? postedAt.toLocaleDateString(
                  'en-GB',
                  postedAt.getFullYear() === new Date().getFullYear()
                      ? { day: 'numeric', month: 'short' }
                      : { day: 'numeric', month: 'short', year: 'numeric' },
              )
            : null;

    const applyLabel = safeApplyHref ? 'Apply on the employer’s site' : 'View this job';
    const actionClass =
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

    return (
        <div className="group min-w-0 rounded-xl border border-border-strong bg-card p-3 transition-colors duration-150 ease-out dark:border-transparent dark:bg-surface-sunken [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50">
            <div className="flex min-w-0 items-start gap-3">
                <CompanyLogo
                    companyName={opp.company}
                    companyWebsite={opp.companyWebsite}
                    companyLogoUrl={opp.companyLogoUrl}
                    applyLink={opp.applyLink}
                    isGovernment={isGovernment}
                    className="size-10 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                    <Link
                        href={jobPath}
                        className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-primary"
                        title={opp.title}
                    >
                        {opp.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground" title={opp.company}>
                        {opp.company}
                    </p>
                </div>
            </div>

            <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
                    {location && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{location}</span>
                        </span>
                    )}
                    {postedLabel && <><Dot /><span className="shrink-0 tabular-nums">{postedLabel}</span></>}
                    <Dot /><span className="shrink-0">{typeLabel}</span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <Link
                        href={jobPath}
                        className="inline-flex h-8 items-center gap-1 text-xs font-semibold text-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        View details
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                    {safeApplyHref ? (
                        <a
                            href={actionHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={applyLabel}
                            aria-label={`${applyLabel}: ${opp.title}`}
                            className={actionClass}
                        >
                            Apply
                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        </a>
                    ) : (
                        <Link href={actionHref} className={actionClass}>
                            View
                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
