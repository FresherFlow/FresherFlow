import Link from 'next/link';
import type { OpportunityCardDTO } from '@fresherflow/types';
import { LatestJobsList } from './LatestJobsList';

export interface LiveBoardCounts {
    jobs: number;
    internships: number;
    walkins: number;
    govt: number;
}

interface LiveBoardProps {
    counts: LiveBoardCounts;
    latest: OpportunityCardDTO[];
}

/**
 * The board, one section below the fold.
 *
 * Replaces two separate bands (a four row board index and a "new jobs daily"
 * proof block) with the same information in one place: how much is here on the
 * left, the five most recent postings on the right. Counts are read from the
 * feed, never written by hand.
 */
export function LiveBoard({ counts, latest }: LiveBoardProps) {
    const rows = [
        { name: 'Off campus jobs', count: counts.jobs, href: '/jobs' },
        { name: 'Internships', count: counts.internships, href: '/jobs/internships' },
        { name: 'Walk in drives', count: counts.walkins, href: '/drives/walk-in' },
        { name: 'Government', count: counts.govt, href: '/govt' },
    ];

    return (
        <section aria-labelledby="board-heading" className="border-b border-border">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-10 sm:py-20">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
                    <div>
                        <h2 id="board-heading" className="ff-h2 font-display">
                            The board, right now.
                        </h2>
                        <p className="ff-body-3 ff-measure mt-4 text-muted-foreground">
                            Four boards, fed by the community and refreshed when something is
                            published.
                        </p>

                        <div className="mt-8 border-t border-border">
                            {rows.map((r) => (
                                <Link
                                    key={r.name}
                                    href={r.href}
                                    className="group flex items-baseline justify-between gap-6 border-b border-border py-4 transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:text-muted-foreground"
                                >
                                    <span className="ff-body-1">{r.name}</span>
                                    <span className="ff-caption-2 whitespace-nowrap tabular-nums text-muted-foreground">
                                        <b className="ff-body-1 text-foreground">
                                            {r.count.toLocaleString('en-IN')}
                                        </b>{' '}
                                        live
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="ff-surface overflow-hidden rounded-2xl">
                        <LatestJobsList jobs={latest} />
                    </div>
                </div>
            </div>
        </section>
    );
}
