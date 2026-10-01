import type { Metadata } from 'next';

/**
 * Metadata for the recruiter directory.
 *
 * `page.tsx` in this segment is a client component (it filters candidates in the browser), and a
 * client component cannot export `metadata`. Without this layout the page inherited the root
 * layout's title and description and shipped no canonical — for a public, indexable, SEO-facing
 * directory that was the whole point of the page.
 */
export const metadata: Metadata = {
    // `absolute` — the title ends in the brand, and the root layout's
    // "%s | FresherFlow" template would append it a second time.
    title: { absolute: 'Hire freshers — browse candidate profiles | FresherFlow' },
    description:
        'Browse fresher profiles by skill, batch and degree. Send a short intro and reach candidates directly — no account needed.',
    alternates: {
        canonical: '/recruiters',
    },
    openGraph: {
        title: 'Hire freshers on FresherFlow',
        description:
            'Browse fresher profiles by skill, batch and degree, then send a direct intro.',
        // Relative so `metadataBase` resolves it; this was the one public page
        // hardcoding an absolute origin.
        url: '/recruiters',
        type: 'website',
    },
};

export default function RecruitersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
