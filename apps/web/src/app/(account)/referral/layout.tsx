import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Referrals & Community',
    description: 'Share job links, invite friends, and view community karma.',
};

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
