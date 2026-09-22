import type { Metadata } from 'next';
import CommunitySubmissionsClient from './CommunitySubmissionsClient';

export const metadata: Metadata = { title: { absolute: 'Community Submissions | FresherFlow Admin' } };

export default function Page() {
    return <CommunitySubmissionsClient />;
}
