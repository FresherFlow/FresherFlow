'use client';

import { useCallback, useState } from 'react';
import { ReportReason } from '@fresherflow/types';
import { communityApi } from '@/features/jobs/api/community';
import { useAuth } from '@/lib/auth/AuthContext';
import { SignalsPanel } from './SignalsPanel';
import { ProvenanceStrip } from './ProvenanceStrip';
import { InterviewExperiences } from './InterviewExperiences';
import { ApplicationUpdates } from './ApplicationUpdates';

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
    { key: ReportReason.SPAM, label: 'Spam' },
    { key: ReportReason.INACCURATE, label: 'Inaccurate' },
    { key: ReportReason.EXPIRED, label: 'Expired' },
    { key: ReportReason.OFFENSIVE, label: 'Offensive' },
    { key: ReportReason.OTHER, label: 'Other' },
];

type Props = {
    opportunityIdOrSlug: string;
    postedByUsername: string | null;
    postedAt: string | Date | null;
    sourceLink: string | null;
};

/**
 * The post-description footer for a job: provenance, a single accuracy signal,
 * a reporting action, and the two things a fresher actually reads before
 * applying - other people's interview experiences and application updates.
 *
 * This used to be a three-tab control (Community / Interviews / Updates) over a
 * threaded discussion with its own composer, five category filters, voting,
 * replies and comment reporting. That tab was the community area, which is
 * paused (see `features/community/communityUi.ts`), and its read was failing
 * anyway - so the page shipped a category filter and a `0/500` composer over an
 * empty list, with "Could not load the discussion" underneath. The two features
 * that still work are now plain sections; they never needed a tab bar between
 * them and a third broken sibling.
 */
export function DiscussionSection({
    opportunityIdOrSlug,
    postedByUsername,
    postedAt,
    sourceLink,
}: Props) {
    const { user } = useAuth();
    const [showJobReport, setShowJobReport] = useState(false);

    const reportJob = useCallback(
        async (reason: ReportReason) => {
            try {
                await communityApi.createReport(opportunityIdOrSlug, { reason });
            } finally {
                setShowJobReport(false);
            }
        },
        [opportunityIdOrSlug]
    );

    return (
        <section id="discussion" className="space-y-5 border-t border-border/40 py-3">
            <ProvenanceStrip
                postedByUsername={postedByUsername}
                postedAt={postedAt}
                sourceLink={sourceLink}
            />

            <SignalsPanel opportunityIdOrSlug={opportunityIdOrSlug} />

            {user && (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowJobReport((v) => !v)}
                        aria-expanded={showJobReport}
                        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
                    >
                        Report this job
                    </button>
                    {showJobReport && (
                        <div className="flex flex-wrap gap-1.5">
                            {REPORT_REASONS.map((reason) => (
                                <button
                                    key={reason.key}
                                    type="button"
                                    onClick={() => void reportJob(reason.key)}
                                    className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                    {reason.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="pt-2">
                <InterviewExperiences opportunityIdOrSlug={opportunityIdOrSlug} />
            </div>

            <div className="pt-2">
                <ApplicationUpdates opportunityIdOrSlug={opportunityIdOrSlug} />
            </div>
        </section>
    );
}
