import Link from 'next/link';

interface HeroSectionProps {
    newToday: number;
    total: number;
}

/**
 * First viewport: the statement, one line of context, one action.
 *
 * The live board used to sit here as a five row feed, which meant a stranger
 * met job titles before they knew what the site was. The feed now lives one
 * section down (`LiveBoard`); what stays above the fold is the promise and the
 * single number that proves the board is alive.
 */
export function HeroSection({ newToday, total }: HeroSectionProps) {
    return (
        <section className="border-b border-border">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-10 pb-12 sm:pt-24 sm:pb-28">
                {/* Statement left, the answer right, both sitting on the same
                    baseline. Nothing sits in the right column that is not part
                    of the offer, so the fold stays one thought. */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
                    <div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-record text-xs tracking-[0.14em] text-muted-foreground">
                            <span className="tabular-nums">{total.toLocaleString('en-IN')}</span>
                            <span>LIVE ROLES</span>
                            {newToday > 0 && (
                                <>
                                    <span aria-hidden>·</span>
                                    <span className="tabular-nums">{newToday.toLocaleString('en-IN')}</span>
                                    <span>ADDED TODAY</span>
                                </>
                            )}
                        </div>

                        {/* Breaks where the thought breaks: the subject, then the verb. */}
                        <h1 className="ff-h1 ff-load font-display ff-hero-gradient mt-5 max-w-[680px]">
                            Your career,
                            <br />
                            one flow.
                        </h1>
                    </div>

                    <div className="lg:pb-2">
                        <p className="ff-body-3 text-muted-foreground">
                            Off campus roles, internships, walk in drives and government vacancies
                            in one place. Every listing opens the employer&apos;s own page, so you
                            can check it is real before you apply.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                            <Link href="/jobs" className="ff-btn ff-btn-primary">
                                Browse jobs
                            </Link>
                            <span className="ff-caption-2 text-muted-foreground">
                                No account needed to read the board.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
