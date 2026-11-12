import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/features/legal/LegalPage';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description:
        'The rules for using FresherFlow: what the board is, what we expect from posts, and what we do not promise.',
    alternates: {
        canonical: '/terms',
    },
};

/**
 * Terms of Service. Same rules as before, in short sentences: what the board
 * is, what we expect, and what we do not promise.
 */

const SECTIONS: readonly LegalSection[] = [
    {
        n: '01',
        title: 'Accepting these terms',
        body: 'Using FresherFlow — the website, the mobile apps or an official integration — means you accept these terms and the Privacy Policy. If you do not, please do not use the platform. Using it after an update takes effect means you accept the updated terms.',
    },
    {
        n: '02',
        title: 'What FresherFlow is',
        body: 'A community board of job, internship and walk-in listings, each linking to the employer\u2019s own application page. We are not a recruitment agency and we do not run hiring. We cannot promise an interview, an offer, or a reply to any application.',
    },
    {
        n: '03',
        title: 'AI assistant integrations',
        body: 'FresherFlow may be reachable through assistants such as ChatGPT. That integration is read-only: it can search and show published listings, and cannot post, apply, create alerts or reach your account. Treat anything an assistant says about a listing as a summary, and check the listing or the employer page before acting on it.',
    },
    {
        n: '04',
        title: 'Community rules',
        body: 'Do not post fake openings, misleading salary claims, referral spam, or anything abusive or unlawful. Listings that break these rules are removed, and repeat offenders lose posting access.',
    },
    {
        n: '05',
        title: 'What you post',
        body: 'Listings, comments, reports and feedback must be truthful, lawful, and yours to share. You keep ownership of what you post and grant FresherFlow a non-exclusive, worldwide licence to host, display and distribute it on the platform. We may edit, reject or remove content, and may suspend accounts that spam, post fraudulent listings or disrupt the service.',
    },
    {
        n: '06',
        title: 'Free for candidates',
        body: 'FresherFlow never charges candidates. We reject paid training packages, paid interview guarantees, and anyone asking a fresher to pay to apply. Report it if you see it.',
    },
    {
        n: '07',
        title: 'Accuracy and expiry',
        body: 'Listings are shared by the community and carry their source. We run automated checks, but details change, roles fill and drives expire. Verify on the official employer page before you apply or travel. We are not responsible for the accuracy of employer information or for the outcome of an application.',
    },
    {
        n: '08',
        title: 'Third-party sites',
        body: 'Applications, interviews and walk-in drives happen on employer websites, under their terms and privacy policies. We are not responsible for their content, security or practices.',
    },
    {
        n: '09',
        title: 'Acceptable use',
        body: 'Use the platform lawfully and fairly. No scraping or bulk extraction beyond normal use, no attempts to breach, overload or get around security and rate limits, no impersonation, and no use of the service to mislead other freshers. Automated access that degrades the service for others may be blocked.',
    },
    {
        n: '10',
        title: 'Intellectual property',
        body: 'The FresherFlow name, design and platform content belong to FresherFlow or its licensors, and may not be copied except as the service allows — sharing a listing link, for example. Employer names, logos and posting content belong to their owners.',
    },
    {
        n: '11',
        title: 'Availability',
        body: 'We aim to keep the board up, but we do not promise uninterrupted or error-free operation. Features can change or be withdrawn, and listings can be edited, expired or removed at any time.',
    },
    {
        n: '12',
        title: 'Limitation of liability',
        body: 'To the extent the law allows, FresherFlow is provided as is, and we are not liable for indirect, incidental or consequential damages from using it — including relying on a listing, travelling to a drive, or acting on a third-party site.',
    },
    {
        n: '13',
        title: 'Governing law',
        body: 'These terms are governed by the laws of India, and disputes fall to the competent courts in India. Questions about them can go to support@fresherflow.in.',
    },
    {
        n: '14',
        title: 'Changes to these terms',
        body: 'These terms will change as the platform does. Material changes are reflected in the date on this page, and continuing to use FresherFlow after they take effect means you accept them.',
    },
];

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            intro="The rules that keep the board honest: real openings, links to the employer, and no charge for anyone applying."
            updated="12 November 2026"
            summary={[
                'We link to the employer\u2019s own page and never charge candidates.',
                'Post real openings or lose posting access.',
                'We do not run hiring and cannot promise an interview or an offer.',
            ]}
            sections={SECTIONS}
            contactEmail="support@fresherflow.in"
            crossLink={{ href: '/privacy', label: 'Read the Privacy Policy' }}
        />
    );
}
