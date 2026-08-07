import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Account & Settings',
    description: 'Manage your candidate profile, recruiter visibility, and platform preferences.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
