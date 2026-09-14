import type { Metadata } from 'next';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
    title: 'Careers',
    description: 'Join the FresherFlow team and help us build the community-driven platform for verifying off-campus opportunities.',
    alternates: {
        canonical: '/careers',
    },
};

/**
 * Careers — homepage design language: mono eyebrow, Bricolage statement
 * headline, sharp 2px buttons, hairlines. Left-aligned like the landing.
 */
export default function CareersPage() {
    return (
        <main className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                Careers
            </div>

            <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
                Help us kill the noise in fresher hiring.
            </h1>

            <p className="mt-5 max-w-[58ch] text-[15.5px] leading-relaxed text-muted-foreground">
                We are building the community-driven platform that keeps entry-level
                hiring honest — real openings, official links, zero placement fees.
                No open positions right now, but we read every message.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
                <a
                    href="mailto:contact@fresherflow.in"
                    className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ff-accent)] px-[18px] py-[10px] text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.98]"
                >
                    Send us your resume <ArrowRightIcon className="h-4 w-4" />
                </a>
                <a
                    href="/about"
                    className="inline-flex items-center gap-2 rounded-[2px] border border-border px-[18px] py-[10px] text-[13.5px] font-semibold transition-transform hover:-translate-y-px hover:border-foreground/40 active:scale-[0.98]"
                >
                    What we stand for
                </a>
            </div>

            {/* principles-style strip, same numbered rhythm as the homepage */}
            <div className="mt-16 border-t border-border pt-10">
                <div className="grid gap-8 sm:grid-cols-3">
                    {[
                        { n: '01', t: 'Community first', d: 'Everything on the platform is shaped by the freshers who use it.' },
                        { n: '02', t: 'Direct links only', d: 'Official career portals — never consultancy redirects, never paid access.' },
                        { n: '03', t: 'Small team, big signal', d: 'We ship fast, keep the product lean, and stay close to users.' },
                    ].map((item) => (
                        <div key={item.n} className="border-l-2 border-[var(--ff-accent)]/50 pl-4">
                            <div className="font-record text-[11px] font-semibold text-[var(--ff-accent)]">{item.n}</div>
                            <h2 className="mt-1.5 text-[15px] font-bold">{item.t}</h2>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{item.d}</p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
