import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Feedback',
    description: 'Share feedback, bug reports, feature suggestions, or praise with the FresherFlow team.',
    alternates: {
        canonical: '/feedback',
    },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
