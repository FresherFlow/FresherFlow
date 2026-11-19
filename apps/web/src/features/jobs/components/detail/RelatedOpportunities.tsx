import type { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { SkeletonJobCard } from '@/features/jobs/components/OpportunitySkeletons';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

type RelatedOpportunitiesProps = {
    relatedOpps: Opportunity[];
    isLoadingRelated: boolean;
    /**
     * `grid` is the wide layout used on error pages and the mobile flow.
     * `rail` stacks compact cards for the detail page's right column.
     */
    layout?: 'grid' | 'rail';
};

/** Quiet separator between prose facts, matching the jobs-page row. */
function Dot() {
    return <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">·</span>;
}

/**
 * One related job per card, matching the jobs-page card: its own border,
 * its own hover state, logo, title, company and a bottom row that carries the
 * meta on the left and a compact boxed action on the right. The action never
 * carries a third-party brand mark, so the rail stays neutral.
 */
function RelatedJobCard({ job }: { job: Opportunity }) {
    const jobPath = getOpportunityPathFromItem(job);
    const applyHref = job.applyLink || jobPath;

    const location = parseOpportunityLocation(job.locations).shortLabel;
    const isGovernment = job.sector === 'GOVERNMENT';
    const typeLabel = isGovernment
        ? 'Govt'
        : isInternshipOpportunity(job)
            ? 'Intern'
            : isWalkinOpportunity(job)
                ? 'Walk-in'
                : 'Job';

    const postedAt = job.postedAt ? new Date(job.postedAt) : null;
    const postedLabel =
        postedAt && !Number.isNaN(postedAt.getTime())
            ? postedAt.toLocaleDateString(
                  'en-GB',
                  postedAt.getFullYear() === new Date().getFullYear()
                      ? { day: 'numeric', month: 'short' }
                      : { day: 'numeric', month: 'short', year: 'numeric' },
              )
            : null;

    const applyLabel = job.applyLink ? 'Apply on the employer’s site' : 'View this job';
    const actionClass =
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

    return (
        <div className="group min-w-0 rounded-xl border border-border-strong bg-card p-3 transition-colors duration-150 ease-out dark:border-transparent dark:bg-surface-sunken [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50">
            <div className="flex min-w-0 items-start gap-3">
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    isGovernment={isGovernment}
                    className="size-10 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                    <Link
                        href={jobPath}
                        className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-primary"
                        title={job.title}
                    >
                        {job.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground" title={job.company}>
                        {job.company}
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
                {job.applyLink ? (
                    <a
                        href={applyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={applyLabel}
                        aria-label={`${applyLabel}: ${job.title}`}
                        className={actionClass}
                    >
                        Apply
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                ) : (
                    <Link href={applyHref} className={actionClass}>
                        View
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                )}
            </div>
        </div>
    );
}

export function RelatedOpportunities({
    relatedOpps,
    isLoadingRelated,
    layout = 'grid',
}: RelatedOpportunitiesProps) {
    const isRail = layout === 'rail';

    return (
        <div className={isRail ? '' : 'mt-8'}>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-transparent">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        Related opportunities
                    </h2>
                    <Link
                        href="/jobs"
                        className="rounded-sm text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary [@media(hover:hover)_and_(pointer:fine)]:hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        View all jobs
                    </Link>
                </div>

                <div className={isRail ? 'mt-3 space-y-2' : 'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                    {isLoadingRelated ? (
                        <>
                            {[1, 2, 3].map((i) => (
                                <SkeletonJobCard key={i} variant="compact" />
                            ))}
                        </>
                    ) : relatedOpps.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-surface-sunken px-4 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                No close matches yet. Check the full feed for more roles.
                            </p>
                        </div>
                    ) : (
                        relatedOpps.map((item) => (
                            <RelatedJobCard key={item.id} job={item} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
