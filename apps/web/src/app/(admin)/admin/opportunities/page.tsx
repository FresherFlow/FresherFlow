import type { Metadata } from 'next';
import OpportunitiesClient from './OpportunitiesClient';

export const metadata: Metadata = { title: { absolute: 'Listings | FresherFlow Admin' } };

export default function Page() {
    return <OpportunitiesClient />;
}
