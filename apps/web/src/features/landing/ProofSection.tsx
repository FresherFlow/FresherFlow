import { OpportunityCardDTO } from '@fresherflow/types';
import { LiveStatsBox } from './LiveStatsBox';
import { LatestJobsList } from './LatestJobsList';

/**
 * "The board moves every day." — the landing's one real content block.
 *
 * It used to pair the latest postings with a dark 7-day bar chart and a
 * four-counter instrument band above it. Both were decoration around the same
 * fact (postings are recent), and next to a real job board they read as filler.
 * The section is now the claim and the evidence: heading, one small stats line,
 * the actual latest postings.
 */

interface ProofSectionProps {
    latest: OpportunityCardDTO[];
}

export function ProofSection({ latest }: ProofSectionProps) {
    return (
        <section className="w-full">
            <div className="mx-auto max-w-[1120px] px-6 py-[72px]">
            <div className="mb-9">
                <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                    Proof of life
                    <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <h2 className="mt-3.5 max-w-[26ch] font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]">
                    The board moves every day.
                </h2>
            </div>

            <LiveStatsBox />

            {/* Latest postings board with discussion counts + Discuss/Apply */}
            <div className="mt-8 border border-border bg-card">
                <LatestJobsList jobs={latest} />
            </div>
            </div>
        </section>
    );
}
