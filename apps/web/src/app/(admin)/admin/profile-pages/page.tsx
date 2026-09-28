import type { Metadata } from 'next';
import ProfilePagesClient from './ProfilePagesClient';

export const metadata: Metadata = {
    title: { absolute: 'Profile Pages | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export default function Page() {
    return <ProfilePagesClient />;
}
