import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * "Companies on the board right now." — matches the accepted mock:
 * pin-dot eyebrow, ruled register rows in mono, hover indent + arrow nudge.
 * Top 7 companies by live openings; honest empty state.
 */

interface CompanyRow {
    name: string;
    slug?: string;
    count: number;
}

export function CompanyRegister({ companies }: { companies: CompanyRow[] }) {
    const rows = companies.slice(0, 7);

    return (
        <section className="w-full">
            <div className="mx-auto max-w-[1120px] px-6 pb-[72px]">
                <div className="mb-9">
                <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                    Company register
                    <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <h2 className="mt-3.5 font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]">
                    Companies on the board right now.
                </h2>
                </div>

                {rows.length === 0 ? (
                    <div className="border-t border-border py-8 text-sm text-muted-foreground">
                        Company openings are being indexed — check the feed.
                    </div>
                ) : (
                    <div className="border-t border-border">
                    {rows.map((c) => (
                        <Link
                            key={c.slug ?? c.name}
                            href={c.slug ? `/companies/${c.slug}` : '/companies'}
                            className="group flex items-center justify-between border-b border-border px-2 py-[15px] font-record text-[14px] tracking-[0.02em] transition-[background-color,padding] hover:bg-card hover:px-4"
                        >
                            <span>{c.name.toUpperCase()}</span>
                            <span className="inline-flex items-center gap-2 font-record text-xs text-muted-foreground">
                                {c.count} OPENING{c.count === 1 ? '' : 'S'}
                                <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
                            </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
