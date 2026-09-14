import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Learn how FresherFlow collects, processes, and protects your professional profile and usage data.',
    alternates: {
        canonical: '/privacy',
    },
};

/**
 * Privacy Policy — homepage design language: accent-dot eyebrow, Bricolage
 * headline, ruled sections with mono numerals, sharp ghost button.
 */

const SECTIONS = [
    {
        n: '01',
        title: 'Data collection',
        body: 'We collect information you provide directly, including your email address, educational background, passout year, and professional preferences. We also collect anonymous interaction data (saves, clicks) to improve our opportunity recommendation engine.',
    },
    {
        n: '02',
        title: 'Data usage',
        body: 'Your data is used to personalize your job feed, send relevant alerts, and maintain your professional preferences. We use industry-standard encryption to protect your sensitive information.',
    },
    {
        n: '03',
        title: 'Third-party services',
        body: "FresherFlow integrates with Firebase (Google) for authentication and push notifications. Your use of these features is subject to Google's privacy policies. We do not sell your personal data to advertisers.",
    },
    {
        n: '04',
        title: 'Data retention & deletion',
        body: 'You have the right to request deletion of your account and associated data at any time via the Account Settings. We process these requests promptly in accordance with applicable data protection laws.',
    },
    {
        n: '05',
        title: 'Updates',
        body: 'We may update this policy from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.',
    },
] as const;

export default function PrivacyPage() {
    return (
        <main className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                Legal documentation
            </div>

            <h1 className="mt-6 max-w-[18ch] font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
                Privacy Policy
            </h1>
            <p className="mt-3 font-record text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground">
                Last updated · May 31, 2026
            </p>

            <p className="mt-6 max-w-[62ch] text-[15.5px] leading-relaxed text-muted-foreground">
                At FresherFlow, we are committed to protecting your professional
                privacy. This policy explains how we collect, manage, and secure
                your information.
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
                    Contact · privacy@fresherflow.in
                </span>
                <Link
                    href="/terms"
                    className="inline-flex items-center gap-2 rounded-[2px] border border-border px-[16px] py-[9px] text-[13px] font-semibold transition-colors hover:border-foreground/40"
                >
                    Read the Terms of Service →
                </Link>
            </div>
        </main>
    );
}
