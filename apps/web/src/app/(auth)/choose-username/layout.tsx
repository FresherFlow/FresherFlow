import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Choose your username',
    description: 'Pick the username other freshers see on your FresherFlow profile, comments and shares.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function ChooseUsernameLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
