import type { Metadata } from 'next';
import LogoutClient from './_components/LogoutClient';

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function LogoutPage() {
    return <LogoutClient />;
}
