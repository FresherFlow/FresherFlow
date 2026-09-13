import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import { LinkHealth, WorkMode } from '@fresherflow/types';
import CompanyLogo from '@/ui/CompanyLogo';
import { cn } from '@repo/ui/utils/cn';
import { HeroSignalStrip } from './HeroSignalStrip';
import { formatBoardTime } from './boardTime';

/**
 * Stamps encode the truth system in type, not decoration (plan 17 §17.1.2).
 * Each one maps to a field we actually have: link health and post time.
 */
const STAMP_BY_HEALTH: Record<string, { label: string; tone: string }> = {
    HEALTHY: { label: 'LIVE', tone: 'border-signal-live/40 bg-signal-live/10 text-signal-live' },
    RETRYING: { label: 'AGING', tone: 'border-signal-aging/40 bg-signal-aging/10 text-signal-aging' },
    BROKEN: { label: 'DEAD', tone: 'border-signal-dead/40 bg-signal-dead/10 text-signal-dead' },
};

/**
 * The hero's signature object (plan 16 §16.2): a REAL recent opening rendered
 * in product chrome, not a screenshot and not fake UI. Server component — the
 * data arrives as a prop from the landing page's existing feed fetch, so the
 * card never adds a client waterfall to LCP. Only the signal strip hydrates.
 */
export function HeroJobCard({ job }: { job: Opportunity }) {
    const stamp = STAMP_BY_HEALTH[job.linkHealth] ?? {
        label: 'UNCONFIRMED',
        tone: 'border-border bg-muted/40 text-muted-foreground',
    };
    const posted = formatBoardTime(job.postedAt);
    const location = job.locations[0];
    const extraLocations = job.locations.length > 1 ? `+${job.locations.length - 1}` : null;
    const workMode = job.workMode && job.workMode !== WorkMode.ONSITE ? job.workMode.toLowerCase() : null;

    return (
        <Link
            href={`/jobs/${job.slug}`}
            className="group block w-full max-w-2xl rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl p-5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <CompanyLogo
                        companyName={job.company}
                        companyWebsite={job.companyWebsite}
                        companyLogoUrl={job.companyLogoUrl}
                        applyLink={job.applyLink}
                        className="w-10 h-10 rounded-lg shrink-0"
                        priority
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{job.company}</p>
                        {location ? (
                            <p className="font-record text-[11px] uppercase tracking-[0.1em] text-muted-foreground truncate">
                                {location}
                                {extraLocations ? ` ${extraLocations}` : ''}
                                {workMode ? ` / ${workMode}` : ''}
                            </p>
                        ) : null}
                    </div>
                </div>
                <span
                    className={cn(
                        'shrink-0 -rotate-2 rounded-md border px-1.5 py-0.5 font-record text-[10px] font-semibold uppercase tracking-[0.14em]',
                        stamp.tone
                    )}
                >
                    {stamp.label}
                </span>
            </div>

            <h3 className="mt-4 font-display text-lg md:text-xl font-bold leading-snug tracking-tight text-foreground group-hover:text-foreground">
                {job.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-record text-[11px] text-muted-foreground tabular-nums">
                {job.salaryRange ? <span>{job.salaryRange}</span> : null}
                {job.passoutYearMin && job.passoutYearMax ? (
                    <span>
                        {job.passoutYearMin}-{job.passoutYearMax} batch
                    </span>
                ) : null}
                {posted ? <span>added {posted}</span> : null}
            </div>

            <div className="mt-4 border-t border-border/50 pt-3">
                <HeroSignalStrip opportunityId={job.slug} />
            </div>
        </Link>
    );
}
