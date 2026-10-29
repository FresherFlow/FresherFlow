'use client';

import Link from 'next/link';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { OpportunityCardDTO } from '@fresherflow/types';
import { CommentCountsProvider, useCommentCount } from '@/features/jobs/hooks/useCommentCounts';
import { COMMUNITY_UI_ENABLED } from '@/features/community/communityUi';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';
import CompanyLogo from '@/features/companies/components/CompanyLogo';

/**
 * Latest jobs with community actions (V1 checklist §G): every card exposes
 * "N discussing · Discuss · Apply". Discuss always renders — even at zero —
 * and Apply opens the verified outbound link (or the detail page when the
 * job has no external link).
 */

function timeAgo(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${Math.max(1, mins)}M AGO`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}H AGO`;
    return h < 48 ? 'YDA' : `${Math.floor(h / 24)}D AGO`;
}

function DiscussingCount({ id }: { id: string }) {
    const count = useCommentCount(id);
    return (
        <span aria-live="polite" className="inline-flex items-center gap-1">
            <ChatBubbleLeftRightIcon aria-hidden className="h-3.5 w-3.5" />
            {count ?? 0} discussing
        </span>
    );
}

function LatestJobRow({ job }: { job: OpportunityCardDTO }) {
    const detailHref = `/jobs/${job.slug}`;
    const discussHref = `${detailHref}#discussion`;
    const outbound = toSafeOutboundUrl(job.applyLink ?? job.companyWebsite);

    return (
        <article className="border-b border-border px-5 py-4 transition-colors last:border-b-0 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40">
            <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4">
                {/* Company mark, not a LIVE/AGING stamp: the logo is what the
                    reader scans for, and the freshness signal already lives in
                    the "posted" date on the right of the same row. */}
                <CompanyLogo
                    companyName={job.company}
                    companyWebsite={job.companyWebsite}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    className="h-10 w-10 object-contain"
                />
                <span className="min-w-0">
                    <Link href={detailHref} className="block truncate text-[14.5px] font-semibold hover:underline">
                        {job.title}
                    </Link>
                    <span className="mt-0.5 block truncate font-record text-[11px] tracking-[0.02em] text-muted-foreground">
                        {job.company.toUpperCase()}
                        {job.locations[0] ? ` · ${job.locations[0].toUpperCase()}` : ''}
                    </span>
                </span>
                <span className="whitespace-nowrap font-record text-[11px] text-muted-foreground/70">
                    {timeAgo(String(job.postedAt))}
                </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[72px] font-record text-[11px] tracking-[0.02em] text-muted-foreground">
                {COMMUNITY_UI_ENABLED && (
                    <>
                        <DiscussingCount id={job.slug || job.id} />
                        <Link
                            href={discussHref}
                            className="font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                        >
                            Discuss
                        </Link>
                    </>
                )}
                {outbound ? (
                    <a
                        href={outbound}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                    >
                        Apply
                    </a>
                ) : (
                    <Link
                        href={detailHref}
                        className="font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                    >
                        Apply
                    </Link>
                )}
            </div>
        </article>
    );
}

export function LatestJobsList({ jobs }: { jobs: OpportunityCardDTO[] }) {
    if (jobs.length === 0) {
        return (
            <div className="px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                    New openings are being gathered right now — check the feed.
                </p>
                <Link
                    href="/contribute"
                    className="mt-4 inline-flex items-center gap-2 rounded-[2px] border border-border px-[18px] py-[10px] text-[13.5px] font-semibold text-foreground transition-transform hover:-translate-y-px hover:border-foreground/40 active:scale-[0.98]"
                >
                    Share a job you spotted
                </Link>
            </div>
        );
    }

    return (
        <CommentCountsProvider>
            <div>
                {jobs.map((o) => (
                    <LatestJobRow key={o.id} job={o} />
                ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
                <p className="font-record text-[11px] tracking-[0.02em] text-muted-foreground">
                    Know something others don&apos;t? Share it.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold">
                    <Link href="/jobs" className="text-muted-foreground transition-colors hover:text-foreground">
                        All jobs →
                    </Link>
                    <Link
                        href="/contribute"
                        className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-3 py-1.5 text-[var(--color-ff-accent-ink)] transition-transform hover:-translate-y-px active:scale-[0.98]"
                    >
                        Contribute
                    </Link>
                </div>
            </div>
        </CommentCountsProvider>
    );
}
