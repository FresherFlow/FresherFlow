import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Choose Unique Handle',
    description: 'Choose your unique username handle for your candidate profile and public portfolio.',
};

export default function ChooseUsernameLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
