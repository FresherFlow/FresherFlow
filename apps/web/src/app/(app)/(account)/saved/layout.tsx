import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Saved Opportunities',
    description: 'Bookmarked off-campus jobs and walk-in drives.',
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
