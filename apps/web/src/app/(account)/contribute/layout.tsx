import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Post a Job / Contribute',
    description: 'Submit an off-campus job link, internship role, or walk-in drive to be reviewed and listed on FresherFlow.',
    alternates: {
        canonical: '/contribute',
    },
};

export default function ContributeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
