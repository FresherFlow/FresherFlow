import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Learn how FresherFlow collects, processes, and protects your professional profile and usage data.',
    alternates: {
        canonical: '/privacy',
    },
};

type Section = {
    n: string;
    title: string;
    body: string;
    points?: readonly string[];
};

/**
 * Privacy Policy — homepage design language: accent-dot eyebrow, Bricolage
 * headline, ruled sections with mono numerals, sharp ghost button.
 */

const SECTIONS: readonly Section[] = [
    {
        n: '01',
        title: 'Who we are',
        body: 'FresherFlow is a job and walk-in opportunity platform for freshers in India. For any privacy question or request, contact us at privacy@fresherflow.in — the same address handles access, correction, and deletion requests.',
    },
    {
        n: '02',
        title: 'Information you provide',
        body: 'When you create an account and build your profile, we store the information you provide directly, along with limited technical and operational data described below:',
        points: [
            'Account details: name, email address, and username (authentication itself is handled by Firebase, Google).',
            'Profile details: educational background, passout year, skills, and professional preferences.',
            'Preferences: job alert settings, saved jobs, application-tracker entries, and feedback you send us.',
            'Support contact: if you email us, we keep the message so we can respond.',
        ],
    },
    {
        n: '03',
        title: 'Account activity vs aggregated use',
        body: 'Not everything counts the same. Saved jobs, applied/planned trackers, alert preferences, listing feedback, and profile views are account-linked: they exist so features like Saved Jobs and alerts work, and they are deleted with your account. We also maintain aggregate usage measures — for example how many times a listing was clicked, saved, or shared — to rank feeds and measure what is useful. Aggregate measures themselves cannot identify you, but the underlying click and share events may be recorded with a random session identifier and platform label for abuse prevention and analytics; where you are signed in, the event may reference your account, and account references are removed if the account is deleted.',
    },
    {
        n: '04',
        title: 'Search and recommendations',
        body: 'Search queries and filters are processed to return results and are not stored against your identity. Recommendations, feed ranking, and job alerts are produced by automated rules over listings and the preferences you set — including AI-assisted extraction and normalization of public job-listing content. We do not make automated decisions about you; alerts only ever reflect criteria you chose.',
    },
    {
        n: '05',
        title: 'ChatGPT and AI integrations',
        body: 'FresherFlow offers a read-only integration for AI assistants such as ChatGPT. When you use FresherFlow through such an integration, the search terms and filters you provide are transmitted to FresherFlow so we can return matching public opportunities, and our public job data is returned through the integration. The current integration only searches and shows published listings: it does not access your account, and using it does not require a FresherFlow account. We do not receive your AI-assistant account identity from these integrations. Like requests made directly to FresherFlow, requests through an AI integration may also generate limited technical information such as IP addresses and request identifiers for rate limiting, security, and operational logging, as described above.',
    },
    {
        n: '06',
        title: 'Security and operational data',
        body: 'Traffic is protected with TLS in transit, and production data stores are access-controlled. To keep the service abuse-free, we process IP addresses and request identifiers transiently for rate limiting and keep short-lived server error logs for debugging. These security records are not used to build profiles and expire automatically.',
    },
    {
        n: '07',
        title: 'Third parties and external links',
        body: 'Authentication runs on Firebase Authentication (Google), which receives the account identifiers you provide such as name, email address, and username to create and manage your account; push notifications, where enabled, also run through Firebase and are subject to Google\u2019s privacy policies. Applying to a job or travelling to a drive always happens on external employer sites: once you leave FresherFlow, that site\u2019s own policies apply. We do not sell your personal data to advertisers or anyone else.',
    },
    {
        n: '08',
        title: 'Retention and deletion',
        body: 'Account-linked data lives as long as your account does. You can permanently delete your profile, saved jobs, tracker data, and account records at any time from Account Settings; deletion removes your account-linked rows, and remaining analytics keep no reference to you. Aggregate counters and de-identified records may be retained for platform analytics. Where law requires longer retention, we keep only what is required.',
    },
    {
        n: '09',
        title: 'Your rights',
        body: 'Under applicable data protection law, including India\u2019s DPDP Act where it applies, you may request access to, correction of, or deletion of your personal data, and you may withdraw consent for optional processing such as alerts. Make any request from Account Settings or by writing to privacy@fresherflow.in, and we will respond within a reasonable time.',
    },
    {
        n: '10',
        title: 'Policy changes',
        body: 'When this policy changes materially, we update the date below and highlight the change in the product where practical. The version in force is always the one published on this page.',
    },
] as const;

export default function PrivacyPage() {
    return (
        <main className="mx-auto w-full max-w-280 px-6 pb-24 pt-16">
            <div className="flex items-center gap-2.5 font-record text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-1.75 w-1.75 rounded-full bg-warning" aria-hidden />
                Legal documentation
            </div>

            <h1 className="mt-6 max-w-xs font-display text-4xl font-extrabold leading-none tracking-tight">
                Privacy Policy
            </h1>
            <p className="mt-3 font-record text-xs uppercase tracking-widest text-muted-foreground">
                Last updated · September 15, 2026
            </p>

            <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground">
                At FresherFlow, we are committed to protecting your professional
                privacy. This policy explains how we collect, manage, and secure
                your information.
            </p>

            {/* ruled sections */}
            <div className="mt-14 border-t border-border">
                {SECTIONS.map((s) => (
                    <section key={s.n} className="grid gap-3 border-b border-border py-8 sm:grid-cols-3 sm:gap-6">
                        <div className="font-record text-xs font-semibold text-warning">{s.n}</div>
                        <h2 className="text-base font-bold text-foreground">{s.title}</h2>
                        <div>
                            <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                            {s.points ? (
                                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                                    {s.points.map((p) => (
                                        <li key={p.slice(0, 24)}>{p}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    </section>
                ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <span className="font-record text-xs tracking-wider text-muted-foreground">
                    Contact · privacy@fresherflow.in
                </span>
                <Link
                    href="/terms"
                    className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                    Read the Terms of Service →
                </Link>
            </div>
        </main>
    );
}
