import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Closing band — LIGHT, theme-aware (like the mock's original statement
 * section: white surface, hairline borders, ink text). It sits between the
 * register section and the dark footer, giving the footer real contrast —
 * light band → dark footer, the same rhythm as the reference (white FAQ →
 * dark footer). Uses theme tokens, so dark mode stays consistent (never a
 * hardcoded white slab).
 */
export function StatementBand() {
    return (
        <section className="border-y border-border bg-background text-foreground">
            <div className="mx-auto max-w-[1120px] px-6 py-24 text-center">
                <div className="flex items-center justify-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                    Get on the board
                </div>
                <h2 className="mx-auto mt-6 max-w-[20ch] font-display text-[clamp(34px,5.4vw,68px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
                    The board is run by the freshers who <span className="text-[var(--ff-accent)]">use it.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-[52ch] text-muted-foreground">
                    Free forever for freshers. No sign-up needed to browse — jump in.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Link
                        href="/jobs"
                        className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-[18px] py-[10px] text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.98]"
                    >
                        Browse jobs <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/post"
                        className="inline-flex items-center gap-2 rounded-[2px] border border-border px-[18px] py-[10px] text-[13.5px] font-semibold transition-transform hover:-translate-y-px hover:border-foreground/40 active:scale-[0.98]"
                    >
                        Join them — post the first job
                    </Link>
                </div>
            </div>
        </section>
    );
}
