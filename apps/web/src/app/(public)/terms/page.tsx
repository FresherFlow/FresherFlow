import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'The terms that govern your use of the FresherFlow platform and community.',
    alternates: {
        canonical: '/terms',
    },
};

type Section = {
    n: string;
    title: string;
    body: string;
};

/**
 * Terms of Service — homepage design language: accent-dot eyebrow, Bricolage
 * headline, ruled sections with mono numerals, sharp ghost button.
 */

const SECTIONS: readonly Section[] = [
    {
        n: '01',
        title: 'Acceptance of terms',
        body: 'By accessing or using FresherFlow — the website, mobile apps, or any official integration — you agree to these terms and to the Privacy Policy. If you do not agree with any part of them, please do not use the platform. Continued use after an update takes effect constitutes acceptance of the updated terms.',
    },
    {
        n: '02',
        title: 'The service',
        body: 'FresherFlow is a community platform that lists job, internship, and walk-in opportunities shared by users, with links to official employer application pages. We do not host employer application processes and we are not a recruitment agency. We do not guarantee employment, interviews, or responses to any application.',
    },
    {
        n: '03',
        title: 'AI assistant integrations',
        body: 'FresherFlow may be accessible through AI assistants such as ChatGPT. The current integration is read-only: it can search and display published listings but cannot post, apply, create alerts, or access your account on your behalf. Anything an assistant tells you about a listing should be verified on FresherFlow or the official employer page before you act on it.',
    },
    {
        n: '04',
        title: 'Community conduct',
        body: 'Do not post fake openings, misleading salary claims, referral spam, or content that is abusive or unlawful. Listings that violate these rules are removed, and repeat offenders lose posting access.',
    },
    {
        n: '05',
        title: 'User-submitted content and moderation',
        body: 'Anything you share — listings, comments, reports, or feedback — must be truthful, lawful, and yours to share. You grant FresherFlow a non-exclusive, worldwide licence to host, display, and distribute that content on the platform. We may edit, reject, or remove any content at our discretion, with or without notice, and we may suspend or terminate accounts that abuse the platform, submit spam or fraudulent listings, or attempt to disrupt the service.',
    },
    {
        n: '06',
        title: 'No fees for candidates',
        body: 'FresherFlow never charges candidates. We reject paid training packages, paid interview guarantees, and any arrangement that asks freshers to pay to apply. Report any such request immediately.',
    },
    {
        n: '07',
        title: 'Accuracy, verification, and expiry',
        body: 'Openings are community-shared and carry their source. We run automated checks on listings, but details can change, fill up, or expire without notice — always verify on the official employer page before applying or travelling to a drive. FresherFlow is not responsible for the accuracy of employer information or for outcomes of your applications.',
    },
    {
        n: '08',
        title: 'Third-party sites',
        body: 'Applications, interviews, and walk-in drives happen on external employer websites. Those sites operate under their own terms and privacy policies, and FresherFlow is not responsible for their content, security, or practices.',
    },
    {
        n: '09',
        title: 'Acceptable use',
        body: 'Use the platform lawfully and fairly: no scraping or bulk extraction outside normal use, no attempts to breach, overload, or circumvent security and rate limits, no impersonation, and no use of the service to mislead other freshers. Automated access that degrades the service for others may be blocked.',
    },
    {
        n: '10',
        title: 'Intellectual property',
        body: 'The FresherFlow name, design, and platform content are owned by FresherFlow or its licensors and may not be copied or reused except as the service itself allows, such as sharing a listing link. Employer names, logos, and posting content belong to their respective owners.',
    },
    {
        n: '11',
        title: 'Availability',
        body: 'We aim to keep FresherFlow available but do not guarantee uninterrupted, error-free operation. Features may change or be withdrawn, and listings may be edited, expired, or removed at any time.',
    },
    {
        n: '12',
        title: 'Limitation of liability',
        body: 'To the maximum extent permitted by law, FresherFlow is provided "as is" and shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform — including reliance on listings, travel to drives, or actions taken on third-party sites.',
    },
    {
        n: '13',
        title: 'Governing law',
        body: 'These terms are governed by the laws of India. Disputes arising from the use of FresherFlow shall be subject to the jurisdiction of competent courts in India. Questions about these terms can be sent to support@fresherflow.in.',
    },
    {
        n: '14',
        title: 'Changes to these terms',
        body: 'We may update these terms as the platform evolves. Material changes will be reflected by the date below, and continued use after an update takes effect means you accept the revised terms.',
    },
] as const;

export default function TermsPage() {
    return (
        <main className="mx-auto w-full max-w-280 px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-1.75 w-1.75 rounded-full bg-warning" aria-hidden />
                Legal documentation
            </div>

            <h1 className="mt-6 max-w-xs font-display text-4xl font-extrabold leading-none tracking-tight">
                Terms of Service
            </h1>
            <p className="mt-3 font-record text-xs uppercase tracking-widest text-muted-foreground">
                Last updated · September 15, 2026
            </p>

            <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground">
                The rules that keep FresherFlow honest: real openings, official
                links, and a community that stays free for freshers.
            </p>

            {/* ruled sections */}
            <div className="mt-14 border-t border-border">
                {SECTIONS.map((s) => (
                    <section key={s.n} className="grid gap-3 border-b border-border py-8 sm:grid-cols-3 sm:gap-6">
                        <div className="font-record text-xs font-semibold text-warning">{s.n}</div>
                        <h2 className="text-base font-bold text-foreground">{s.title}</h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                    </section>
                ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <span className="font-record text-xs tracking-wider text-muted-foreground">
                    Contact · support@fresherflow.in
                </span>
                <Link
                    href="/privacy"
                    className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                    Read the Privacy Policy →
                </Link>
            </div>
        </main>
    );
}
