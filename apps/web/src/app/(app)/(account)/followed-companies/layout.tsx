import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Followed Companies',
    description: 'Manage hiring channels and companies you follow on FresherFlow.',
};

export default function FollowedCompaniesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
