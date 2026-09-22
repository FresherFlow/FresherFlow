import type { Metadata } from 'next';
import ProfilePagesClient from './ProfilePagesClient';

export const metadata: Metadata = { title: { absolute: 'Profile Pages | FresherFlow Admin' } };

export default function Page() {
    return <ProfilePagesClient />;
}
