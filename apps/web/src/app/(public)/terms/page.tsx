import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'The terms that govern your use of the FresherFlow platform and community.',
    alternates: {
        canonical: '/terms',
    },
};

/**
 * Terms of Service — homepage design language: accent-dot eyebrow, Bricolage
 * headline, ruled sections with mono numerals, sharp ghost button.
 */

const SECTIONS = [
    {
        n: '01',
        title: 'Acceptance of terms',
        body: 'By accessing or using FresherFlow, you agree to these terms. If you do not agree with any part of them, please do not use the platform.',
    },
    {
        n: '02',
        title: 'The service',
        body: 'FresherFlow is a community platform that lists job, internship, and walk-in opportunities shared by users, with links to official employer application pages. We do not host employer application processes and we are not a recruitment agency.',
    },
    {
        n: '03',
        title: 'Community conduct',
        body: 'Do not post fake openings, misleading salary claims, referral spam, or content that is abusive or unlawful. Listings that violate these rules are removed, and repeat offenders lose posting access.',
    },
    {
        n: '04',
        title: 'No fees for candidates',
        body: 'FresherFlow never charges candidates. We reject paid training packages, paid interview guarantees, and any arrangement that asks freshers to pay to apply. Report any such request immediately.',
    },
    {
        n: '05',
        title: 'Accuracy of listings',
        body: 'Openings are community-shared and carry their source. Details can change or expire — always verify on the official employer page before applying or traveling to a drive.',
    },
    {
        n: '06',
        title: 'Limitation of liability',
        body: 'To the maximum extent permitted by law, FresherFlow is provided "as is" and shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.',
    },
] as const;

export default function TermsPage() {
    return (
        <main className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                Legal documentation
            </div>

            <h1 className="mt-6 max-w-[18ch] font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
                Terms of Service
            </h1>
            <p className="mt-3 font-record text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground">
                Last updated · May 31, 2026
            </p>

            <p className="mt-6 max-w-[62ch] text-[15.5px] leading-relaxed text-muted-foreground">
                The rules that keep FresherFlow honest: real openings, official
                links, and a community that stays free for freshers.
            </p>

            {/* ruled sections */}
            <div className="mt-14 border-t border-border">
                {SECTIONS.map((s) => (
                    <section key={s.n} className="grid gap-3 border-b border-border py-8 sm:grid-cols-[64px_220px_1fr] sm:gap-6">
                        <div className="font-record text-[12px] font-semibold text-[var(--ff-accent)]">{s.n}</div>
                        <h2 className="text-[16px] font-bold text-foreground">{s.title}</h2>
                        <p className="text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
                    </section>
                ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <span className="font-record text-[12px] tracking-[0.06em] text-muted-foreground">
                    Contact · support@fresherflow.in
                </span>
                <Link
                    href="/privacy"
                    className="inline-flex items-center gap-2 rounded-[2px] border border-border px-[16px] py-[9px] text-[13px] font-semibold transition-colors hover:border-foreground/40"
                >
                    Read the Privacy Policy →
                </Link>
            </div>
        </main>
    );
}
