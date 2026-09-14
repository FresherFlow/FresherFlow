import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * "One board for every kind of opening." — matches the accepted mock:
 * pin-dot eyebrow + hairline, big Bricolage rows numbered 01–04 with live
 * counts and hover arrows. Full-width section, centered 1120px container.
 */

export interface BoardsData {
    jobs: number;
    internships: number;
    walkins: number;
    govt: number;
}

export function BoardsSection({ data }: { data: BoardsData }) {
    const rows = [
        { idx: '01', name: 'Off-Campus Jobs', count: data.jobs, href: '/jobs' },
        { idx: '02', name: 'Internships', count: data.internships, href: '/jobs/internships' },
        { idx: '03', name: 'Walk-in Drives', count: data.walkins, href: '/jobs/walkins' },
        { idx: '04', name: 'Government', count: data.govt, href: '/govt' },
    ];

    return (
        <section className="w-full">
            <div className="mx-auto max-w-[1120px] px-6 py-[72px]">
                <div className="mb-9">
                    <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                        THE BOARDS
                        <span className="h-px flex-1 bg-border" aria-hidden />
                    </div>
                    <h2 className="mt-3.5 font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]">
                        One board for every kind of opening.
                    </h2>
                    <p className="mt-3 text-[15px] text-muted-foreground">
                        Each board is fed by the community and refreshed on publish — counts are live, not marketing.
                    </p>
                </div>

                <div className="border-t border-border">
                    {rows.map((r) => (
                        <Link
                            key={r.idx}
                            href={r.href}
                            className="group grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-border px-2 py-[22px] transition-colors hover:bg-card sm:grid-cols-[120px_1fr_auto] sm:gap-6 sm:px-2"
                        >
                            <span className="font-record text-[12px] tracking-[0.1em] text-muted-foreground/70">
                                {r.idx}
                            </span>
                            <span className="font-display text-[clamp(20px,2.6vw,30px)] font-bold tracking-[-0.01em]">
                                {r.name}
                            </span>
                            <span className="inline-flex items-center gap-2 whitespace-nowrap font-record text-[13px] text-muted-foreground">
                                <b className="font-semibold text-foreground">{r.count.toLocaleString('en-IN')}</b> live
                                <ArrowRightIcon className="h-4 w-4 text-muted-foreground/70 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
