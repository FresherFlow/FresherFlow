import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Application Tracker',
    description: 'Track your active job applications, interview stages, and offers.',
};

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
