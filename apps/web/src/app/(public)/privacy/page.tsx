import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/features/legal/LegalPage';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description:
        'What FresherFlow collects, why it exists, how long it is kept, and how to delete it.',
    alternates: {
        canonical: '/privacy',
    },
};

/**
 * Privacy Policy. Same commitments as before, written to be read: what we hold,
 * why it exists, and what you can do about it.
 */

const SECTIONS: readonly LegalSection[] = [
    {
        n: '01',
        title: 'Who we are',
        body: 'FresherFlow is a job and walk-in board for freshers in India. Write to privacy@fresherflow.in for any privacy request — access, correction or deletion. The same address reaches a person, not a ticket queue.',
    },
    {
        n: '02',
        title: 'What you give us',
        body: 'We store what you enter, plus the limited operational data described below.',
        points: [
            'Account: name, email address and username. Sign-in itself is handled by Firebase Authentication (Google).',
            'Profile: education, passout year, skills and the preferences you set.',
            'Activity you choose: job alerts, saved jobs, application-tracker entries and feedback.',
            'Support: if you email us, we keep the message so we can reply.',
        ],
    },
    {
        n: '03',
        title: 'What stays tied to your account',
        body: 'Saved jobs, tracker entries, alert preferences, listing feedback and profile views are account-linked: they exist so Saved Jobs and alerts work, and they are deleted with your account. Separately, we keep aggregate counts — how often a listing was clicked, saved or shared — to rank the board. A count cannot identify you. The underlying event may carry a random session identifier for abuse prevention, and if you were signed in it may reference your account; that reference is removed when the account is deleted.',
    },
    {
        n: '04',
        title: 'Search and recommendations',
        body: 'Your queries and filters are used to return results and are not stored against your identity. Feed ranking and alerts are produced by fixed rules over listings and the preferences you set, which includes AI-assisted extraction of public job-listing content. There is no automated decision-making about you: an alert only ever reflects criteria you chose.',
    },
    {
        n: '05',
        title: 'AI assistants',
        body: 'FresherFlow can be read through AI assistants such as ChatGPT. Your search terms are sent to FresherFlow to return public listings, and published listings are returned through the integration. It is read-only: it cannot reach your account, and no FresherFlow account is needed to use it. We do not receive your assistant account identity. Requests through an assistant can log the same limited technical data as a normal request — IP address and request identifier — for rate limiting and security.',
    },
    {
        n: '06',
        title: 'Security and operational data',
        body: 'Traffic is encrypted in transit with TLS, and production data stores are access-controlled. IP addresses and request identifiers are processed transiently for rate limiting, and short-lived error logs are kept for debugging. Those records are not used to build profiles and expire on their own.',
    },
    {
        n: '07',
        title: 'Third parties and external links',
        body: 'Authentication and, where enabled, push notifications run on Firebase (Google), which receives the account details needed to run them and is subject to Google\u2019s privacy policies. Applying to a job or travelling to a drive happens on the employer\u2019s own site, where that site\u2019s policy applies. We do not sell your personal data to advertisers or anyone else.',
    },
    {
        n: '08',
        title: 'Retention and deletion',
        body: 'Account-linked data lives as long as the account does. You can delete your profile, saved jobs, tracker data and account from Account Settings; account-linked rows go with it, and remaining analytics hold no reference to you. Aggregate and de-identified records may be kept for platform analytics, and where the law requires a longer retention we keep only what is required.',
    },
    {
        n: '09',
        title: 'Your rights',
        body: 'Under applicable data protection law, including India\u2019s DPDP Act where it applies, you can ask to see, correct or delete your personal data, and you can withdraw consent for optional processing such as alerts. Make the request from Account Settings or by writing to privacy@fresherflow.in; we respond within a reasonable time.',
    },
    {
        n: '10',
        title: 'Changes to this policy',
        body: 'When a change is material we update the date on this page and highlight it in the product where practical. The version published here is the one in force.',
    },
];

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            intro="You should not need a law degree to know what a job board holds about you. This page says what we collect, why it exists, and how to remove it."
            updated="12 November 2026"
            summary={[
                'Your profile exists so alerts, saved jobs and applications work — not to be sold.',
                'Job applications open the employer\u2019s own site; that site\u2019s rules then apply.',
                'You can delete your account and everything tied to it from Account Settings.',
            ]}
            sections={SECTIONS}
            contactEmail="privacy@fresherflow.in"
            crossLink={{ href: '/terms', label: 'Read the Terms of Service' }}
        />
    );
}
