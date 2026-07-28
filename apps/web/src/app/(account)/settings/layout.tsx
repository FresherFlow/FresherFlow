import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Account Settings',
    description: 'Manage account security, credentials, and notification preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
