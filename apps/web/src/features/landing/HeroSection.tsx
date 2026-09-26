import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Landing hero — matches the accepted mock:
 * LIVE note chip, 3 headline lines (one per sentence, block-level so no
 * mid-sentence wraps), orange accent on "learn.", three CTAs (board,
 * discussion, post), mono meta row, BOARD 00 eyebrow. Light brand surface
 * in both themes.
 *
 * Headline is the V1 product message: "Find jobs. Ask people. Share what
 * you learn." (see files/checklists/v1-job-community-checklist.md §G).
 */

interface HeroSectionProps {
    newToday: number;
    refreshedAt: Date | null;
    /** Deep link to a live discussion (first latest job), falls back to /jobs. */
    discussHref?: string;
}

export function HeroSection({ newToday, refreshedAt, discussHref = '/jobs' }: HeroSectionProps) {
    const mins = refreshedAt ? Math.max(0, Math.floor((Date.now() - refreshedAt.getTime()) / 60000)) : null;
    const age =
        mins === null
            ? null
            : mins < 1
              ? 'JUST NOW'
              : mins < 60
                ? `${mins}M AGO`
                : mins < 1440
                  ? `${Math.floor(mins / 60)}H AGO`
                  : `${Math.floor(mins / 1440)}D AGO`;

    return (
        <section className="relative">
            <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-10">
                <span className="ff-hero-note ff-pin-in">
                    <span aria-hidden className="text-[var(--ff-accent)]">
                        ·
                    </span>{' '}
                    <b>LIVE</b> — updated every time a job is published
                </span>

                <h1 className="ff-hero-h1 font-display text-[clamp(44px,7.4vw,92px)] font-extrabold leading-[0.98] tracking-[-0.03em]">
                    <span className="line" style={{ animationDelay: '0.05s' }}>
                        Find jobs.
                    </span>
                    <span className="line" style={{ animationDelay: '0.18s' }}>
                        Ask people.
                    </span>
                    <span className="line" style={{ animationDelay: '0.34s' }}>
                        Share what you <span className="accent">learn.</span>
                    </span>
                </h1>

                <p className="ff-hero-sub">
                    Off-campus drives, internships and walk-ins across India — with real discussion on every job. Ask
                    questions, share interview experiences, and help the next fresher. All roles link straight to
                    official pages.
                </p>

                <div className="ff-hero-ctas">
                    <Link
                        href="/jobs"
                        className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-[18px] py-[10px] text-[13.5px] font-semibold text-paper transition-transform hover:-translate-y-px active:scale-[0.98]"
                    >
                        Browse the board <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                    <Link
                        href={discussHref}
                        className="inline-flex items-center gap-2 rounded-[2px] border border-foreground/80 px-[18px] py-[10px] text-[13.5px] font-semibold text-foreground transition-transform hover:-translate-y-px active:scale-[0.98]"
                    >
                        Ask / Discuss
                    </Link>
                    <Link
                        href="/post"
                        className="inline-flex items-center gap-2 rounded-[2px] border border-border px-[18px] py-[10px] text-[13.5px] font-semibold text-foreground transition-transform hover:-translate-y-px hover:border-foreground/40 active:scale-[0.98]"
                    >
                        Post an opportunity
                    </Link>
                </div>

                <div className="ff-hero-meta">
                    <span>
                        · <b>+{newToday}</b> TODAY
                    </span>
                    {age && (
                        <span>
                            · REFRESHED <b>{age}</b>
                        </span>
                    )}
                    <span>· ALL LINKS CHECKED DAILY</span>
                </div>

                <div className="ff-hero-eyebrow flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-pin)]" aria-hidden />
                    BOARD 00 · THE NUMBERS
                    <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
            </div>
        </section>
    );
}
