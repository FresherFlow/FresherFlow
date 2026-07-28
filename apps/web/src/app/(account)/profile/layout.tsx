import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Candidate Profile',
    description: 'Update your education, skills, career preferences, and portfolio links.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
