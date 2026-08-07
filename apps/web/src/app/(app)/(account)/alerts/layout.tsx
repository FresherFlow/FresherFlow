import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Job Alerts & Notifications',
    description: 'Notification preferences and job match alert settings.',
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
