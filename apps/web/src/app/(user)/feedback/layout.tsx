import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Submit Feedback & Support',
    description: 'Submit platform feedback and track feature request support status.',
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
