/**
 * "Job boards list. Freshers confirm." — matches the accepted mock:
 * white surface band, two hairline-divided columns with 5 points each,
 * mono uppercase column tags (gray vs orange), ✕/✓ mono icons.
 */

const ELSE = [
    'Listings scraped and abandoned — nobody checks if they are real',
    'Dead apply links discovered only after you have applied',
    'Zero proof — you cannot see who else got in',
    'Eligibility buried in 800-word descriptions',
    'Comments full of bots and referral spam',
];

const HERE = [
    'Every listing links straight to the official page',
    'Link health checked — freshness you can see',
    'Freshers confirm, report and update openings',
    'Batch eligibility up front — your year, visible',
    'Real discussion with real freshers on every job',
];

export function ComparisonSection() {
    return (
        <section className="border-y border-border bg-card">
            <div className="mx-auto max-w-[1120px] px-6 py-[72px]">
                <div className="mb-9">
                    <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                        Why the board
                        <span className="h-px flex-1 bg-border" aria-hidden />
                    </div>
                    <h2 className="mt-3.5 max-w-[26ch] font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]">
                        Job boards list. Freshers confirm.
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
                    <div className="bg-background px-[30px] py-9">
                        <span className="font-record text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
                            Ordinary job boards
                        </span>
                        <ul className="mt-1">
                            {ELSE.map((t) => (
                                <li
                                    key={t}
                                    className="flex items-start gap-3 border-t border-border py-[13px] text-[14.5px] text-muted-foreground first:border-t-0"
                                >
                                    <span aria-hidden className="font-record font-semibold text-muted-foreground/60">
                                        ✕
                                    </span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-card px-[30px] py-9">
                        <span className="font-record text-[10.5px] uppercase tracking-[0.14em] text-[var(--ff-accent)]">
                            The FresherFlow board
                        </span>
                        <ul className="mt-1">
                            {HERE.map((t) => (
                                <li
                                    key={t}
                                    className="flex items-start gap-3 border-t border-border py-[13px] text-[14.5px] text-foreground first:border-t-0"
                                >
                                    <span aria-hidden className="font-record font-semibold text-[var(--color-signal-live)]">
                                        ✓
                                    </span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
